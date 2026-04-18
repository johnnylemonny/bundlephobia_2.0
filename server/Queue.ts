import debug from 'debug'

const log = debug('bp:queue')

export enum JobStatus {
  READY = 'ready',
  PROCESSING = 'processing',
}

export enum Priority {
  LOW = 5,
  MEDIUM = 10,
  HIGH = 20,
}

export interface Job<T = any> {
  id: string
  type: string
  maxAge: number
  priority: number
  addedTime: Date
  status: JobStatus
  params: T
  successListeners: Array<(result: any) => void>
  failureListeners: Array<(err: any) => void>
}

export interface QueueOptions {
  concurrency?: number
  aging?: boolean
  maxAge?: number
}

/**
 * A simple promise based throttle queue with support
 * for priorities, concurrency control, job de-duplication,
 * and more.
 */
export class Queue {
  private jobs: Job[] = []
  private options: Required<QueueOptions>
  private executorMap: Record<string, (params: any) => any | Promise<any>> = {}

  static priority = Priority

  constructor(options: QueueOptions = {}) {
    this.options = {
      concurrency: 1,
      aging: true,
      maxAge: Number.POSITIVE_INFINITY,
      ...options,
    }
  }

  /**
   * Set a function (async or sync) that
   * executes the jobs sent to the queue.
   * The handler will be passed a params object.
   */
  addExecutor(jobType: string, handler: (params: any) => any | Promise<any>) {
    this.executorMap[jobType] = handler
  }

  hasJob(id: string, type: string): boolean {
    return this.jobs.some(job => job.id === id && type === job.type)
  }

  getRunningJobs(): Job[] {
    return this.jobs.filter(job => job.status === JobStatus.PROCESSING)
  }

  getReadyJobs(): Job[] {
    return this.jobs.filter(job => job.status === JobStatus.READY)
  }

  /**
   * Remove "ready" jobs from the queue that have
   * lived past their max age. Removed jobs have
   * their failure listeners notified of the same.
   */
  pruneQueue() {
    this.getReadyJobs().forEach(job => {
      const { addedTime, maxAge, failureListeners } = job
      const isJobExpired = (addedTime.getTime() + maxAge) * 1000 < Date.now()

      if (isJobExpired) {
        failureListeners.forEach(listener => {
          listener({
            code: 'JOB_EXPIRED',
            message:
              "This job's age exceeded it's specified maxAge, and was dropped",
          })
        })
      }
    })
  }

  /**
   * Get the next "ready" job from the queue
   * to be executed. The next ready job depends on -
   * 1) Priority: higher priority always executes first
   * 2) Time Added: if priorities are equal, the older
   * job executes first.
   */
  getNextJobToRun(): Job | undefined {
    const readyJobs = this.jobs.filter(job => job.status === JobStatus.READY)
    
    readyJobs.sort((jobA, jobB) => {
      const priorityDiff = jobB.priority - jobA.priority
      if (priorityDiff) {
        return priorityDiff
      }
      return jobA.addedTime.getTime() - jobB.addedTime.getTime()
    })

    return readyJobs[0]
  }

  /**
   * Increments the priorities of "ready" jobs
   * in the queue to prevent starvation of lower
   * priority jobs.
   */
  ageJobs() {
    this.jobs
      .filter(job => job.status === JobStatus.READY)
      .forEach(job => {
        job.priority += 1
      })
    log(
      'after aging, job queue is... %o',
      this.jobs.map(({ id, type, priority }) => ({ id, type, priority }))
    )
  }

  removeJob(id: string, type: string) {
    this.jobs = this.jobs.filter(job => job.id !== id || job.type !== type)
  }

  /**
   * Clear the queue of all "ready" jobs. Jobs
   * in execution are not terminated prematurely.
   * Jobs being terminated have their failure listeners notified.
   */
  clear() {
    this.jobs
      .filter(job => job.status === JobStatus.READY)
      .forEach(job => {
        job.failureListeners.forEach(failureListener => {
          failureListener({
            code: 'QUEUE_CLEARED',
            message: 'This job was terminated since the queue was cleared',
            job,
          })
        })
      })
    this.jobs = []
  }

  setJobToProcessing(id: string, type: string) {
    this.jobs.forEach(job => {
      if (job.id === id && job.type === type) {
        job.status = JobStatus.PROCESSING
      }
    })
  }

  /**
   * Executes the next job in queue iff
   * they haven't expired and concurrency
   * limit is not already achieved.
   */
  executeNextJobIfPossible() {
    if (!this.getReadyJobs().length) {
      log('all done. job queue is empty')
      return
    }

    if (this.getRunningJobs().length < this.options.concurrency) {
      if (this.options.aging) {
        this.ageJobs()
      }
      this.pruneQueue()
      this.executeNextJob()
    } else {
      log('waiting... all workers in queue are occupied')
    }
  }

  executeNextJob() {
    const nextJob = this.getNextJobToRun()
    if (!nextJob) return

    log('executing job ... %o', {
      id: nextJob.id,
      type: nextJob.type,
      priority: nextJob.priority,
    })

    this.setJobToProcessing(nextJob.id, nextJob.type)
    const callResult = this.executorMap[nextJob.type].call(this, nextJob.params)

    Promise.resolve(callResult)
      .then(result => {
        log('job %s was a success, removing it', nextJob.id, nextJob.type)
        nextJob.successListeners.forEach(listener => {
          listener.call(this, result)
        })

        this.removeJob(nextJob.id, nextJob.type)
        this.executeNextJobIfPossible()
      })
      .catch(err => {
        log('job %s was a failure, removing it', nextJob.id, nextJob.type)
        nextJob.failureListeners.forEach(listener => {
          listener.call(this, err)
        })

        this.removeJob(nextJob.id, nextJob.type)
        this.executeNextJobIfPossible()
      })
  }

  addListenersToJob(id: string, type: string, { resolve, reject }: { resolve: (val: any) => void, reject: (err: any) => void }) {
    this.jobs.forEach(job => {
      if (job.id === id && job.type === type) {
        job.successListeners.push(resolve)
        job.failureListeners.push(reject)
      }
    })
  }

  /**
   * Processes a job with specified ID, type and parameters.
   */
  process(id: string, type: string, jobParams: any, options: any = {}) {
    log('added new job %s %o %o', type, jobParams, options)
    const {
      priority = Priority.LOW,
      maxAge = this.options.maxAge,
      onSuccess = () => {},
      onFailure = () => {},
    } = options
    this.pruneQueue()

    return new Promise((resolve, reject) => {
      // If a job with the given id already exists,
      // just add the success / failure callbacks to
      // that existing job (dedup)
      if (this.hasJob(id, type)) {
        log('job id %s already present, adding callbacks', id)
        this.addListenersToJob(id, type, { resolve: resolve as any, reject: reject as any })
        return
      }

      this.jobs.push({
        id,
        type,
        maxAge,
        priority,
        addedTime: new Date(),
        status: JobStatus.READY,
        params: jobParams,
        successListeners: [resolve as any, onSuccess],
        failureListeners: [reject as any, onFailure],
      })

      this.executeNextJobIfPossible()
    })
  }
}

export default Queue
