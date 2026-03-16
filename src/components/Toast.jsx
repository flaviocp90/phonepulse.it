import { useEffect, useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  function addToast(message, type = 'success') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }

  return { toasts, addToast }
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`font-body text-sm px-4 py-3 rounded-xl shadow-lg text-white animate-fade-in pointer-events-auto ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-dark'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
