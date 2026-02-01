export const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok || !data.success) {
    const error = new Error(data.error || 'An error occurred while fetching the data.')
    // @ts-ignore
    error.info = data
    // @ts-ignore
    error.status = res.status
    throw error
  }

  return data.data
}
