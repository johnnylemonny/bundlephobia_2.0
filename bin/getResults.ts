import firebase from 'firebase/compat/app'
import 'firebase/compat/database'
import { encodeFirebaseKey, decodeFirebaseKey } from '../utils/index'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

function getFirebaseStoreFromDisk(): Record<string, Record<string, unknown>> | null {
  try {
    const dataPath = path.join(__dirname, 'data', 'firebase-modules.json')
    const rawData = fs.readFileSync(dataPath, 'utf8')
    return JSON.parse(rawData) as Record<string, Record<string, unknown>>
  } catch (err) {
    console.log('not found on disk')
    return null
  }
}

async function getFirebaseStoreFromNetwork() {
  const modulesRef = firebase.database().ref('modules-v2')
  const lastSnapshot =
    ((await modulesRef.limitToLast(1).once('value').then(snapshot => snapshot.val())) as
      | Record<string, unknown>
      | null) ?? {}
  const firstSnapshot =
    ((await modulesRef
      .limitToFirst(1)
      .once('value')
      .then(snapshot => snapshot.val())) as Record<string, unknown> | null) ??
    {}

  const lastEntry = Object.keys(lastSnapshot)[0]
  const firstEntry = Object.keys(firstSnapshot)[0]

  let currentLastEntry = firstEntry
  let allData: Record<string, Record<string, unknown>> = {}
  let counter = 0

  console.log('fetching from ', firstEntry, ' to ', lastEntry)

  while (currentLastEntry !== lastEntry) {
    counter += 20000
    const snapshot = (await firebase
      .database()
      .ref('modules-v2')
      .orderByKey()
      .startAt(currentLastEntry)
      .limitToFirst(20000)
      .once('value')
      .then(snapshot => snapshot.val())) as Record<
      string,
      Record<string, unknown>
    >

    const packageNames = Object.keys(snapshot)
    currentLastEntry = packageNames[packageNames.length - 1]
    console.log(
      'Fetched records till ',
      counter,
      currentLastEntry,
      'total of ',
      packageNames.length,
      ' packages.'
    )
    allData = { ...allData, ...snapshot }
  }

  const dataDir = path.join(__dirname, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  fs.writeFileSync(
    path.join(dataDir, 'firebase-modules.json'),
    JSON.stringify(allData, null, 2),
    'utf8'
  )

  return allData
}

export async function getResults() {
  const firebaseStore = getFirebaseStoreFromDisk()
  if (!firebaseStore) return []
  console.log('loaded firebase store')
  return Object.keys(firebaseStore).flatMap(packageName =>
    Object.keys(firebaseStore[packageName]).map(
      version => firebaseStore[packageName][version]
    )
  )
}

export async function getPackages() {
  const firebaseStore =
    getFirebaseStoreFromDisk() || (await getFirebaseStoreFromNetwork())
  const packages = Object.keys(firebaseStore).map(
    packageName => firebaseStore[packageName]
  )
  console.log('fetched ', Object.keys(firebaseStore).length, ' packages ')
  return packages
}

export {}
