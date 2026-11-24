'use client'
export default function FormStatus({ state }) {
  if (!state) return null
  return state.error ? <p className="err">{state.error}</p> : <p className="okmsg">{state.ok}</p>
}
