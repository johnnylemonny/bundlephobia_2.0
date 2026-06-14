declare const amplitude: any

type HasPackageName = {
  packageName: string
}

type HasTimeTaken = {
  timeTaken: number
}

type HasIsDisabled = {
  isDisabled: boolean
}

type HasSuccessRatio = {
  successRatio: number
}

type HasPackageNameAndTimeTaken = HasPackageName & HasTimeTaken

function safeLogEvent(eventName: string, data?: Record<string, any>) {
  try {
    if (typeof window !== 'undefined' && typeof amplitude !== 'undefined') {
      amplitude.getInstance().logEvent(eventName, data)
    }
  } catch (err) {
    // Amplitude SDK blocked or not loaded
  }
}

export default class Analytics {
  static pageView(pageType: string) {
    safeLogEvent(`Viewed ${pageType}`, {
      path: window.location.pathname,
    })
  }

  static performedSearch(packageName: string) {
    safeLogEvent('Search Performed', {
      package: packageName,
    })
  }

  static searchSuccess({ packageName, timeTaken }: HasPackageNameAndTimeTaken) {
    safeLogEvent('Search Successful', {
      package: packageName,
      timeTaken,
    })
  }

  static searchFailure({ packageName, timeTaken }: HasPackageNameAndTimeTaken) {
    safeLogEvent('Search Failed', {
      package: packageName,
      timeTaken,
    })
  }

  static graphBarClicked({
    packageName,
    isDisabled,
  }: HasPackageName & HasIsDisabled) {
    safeLogEvent('Bar Graph Clicked', {
      package: packageName,
      isDisabled,
    })
  }

  static scanPackageJsonDropped(itemCount: number) {
    safeLogEvent('Scan packageJSON dropped', {
      itemCount,
    })
  }

  static performedScan() {
    safeLogEvent('Scan Performed')
  }

  static scanParseError() {
    safeLogEvent('Scan Parse Error')
  }

  static scanCompleted({
    timeTaken,
    successRatio,
  }: HasTimeTaken & HasSuccessRatio) {
    safeLogEvent('Scan Parse Completed', {
      successRatio,
      timeTaken,
    })
  }

  static performedExportsAnalysis(packageName: string) {
    safeLogEvent('Exports Analysis Performed', {
      package: packageName,
    })
  }

  static exportsAnalysisSuccess({
    packageName,
    timeTaken,
  }: HasPackageNameAndTimeTaken) {
    safeLogEvent('Exports Analysis Successful', {
      package: packageName,
      timeTaken,
    })
  }

  static exportsAnalysisFailure({
    packageName,
    timeTaken,
  }: HasPackageNameAndTimeTaken) {
    safeLogEvent('Exports Analysis Failed', {
      package: packageName,
      timeTaken,
    })
  }

  static exportsSizesSuccess({
    packageName,
    timeTaken,
  }: HasPackageNameAndTimeTaken) {
    safeLogEvent('Exports Size Calculated', {
      package: packageName,
      timeTaken,
    })
  }

  static exportsSizesFailure({
    packageName,
    timeTaken,
  }: HasPackageNameAndTimeTaken) {
    safeLogEvent('Exports Size Failed', {
      package: packageName,
      timeTaken,
    })
  }
}
