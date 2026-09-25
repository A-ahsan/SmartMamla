// Safe localStorage wrappers (private mode / blocked storage must not crash the app)
export const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
export const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}
export const remove = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
