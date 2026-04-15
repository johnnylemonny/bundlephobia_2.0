export function encodeFirebaseKey(key: string): string {
  return key.replace(/[.]/g, ',').replace(/\//g, '__')
}
