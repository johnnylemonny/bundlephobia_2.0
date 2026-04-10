import axios from 'axios'

/**
 * Trigger a Netlify build hook to rebuild the static site.
 * This is used when new data is available that should be reflected
 * in the statically generated parts of the application.
 */
export async function rebuild(path: string) {
  try {
    const response = await axios.post(`https://api.netlify.com/build-hooks/${path}`)
    return response.data
  } catch (error) {
    // Re-throw or handle error as needed
    console.error('Failed to trigger Netlify rebuild:', error)
    throw error
  }
}
