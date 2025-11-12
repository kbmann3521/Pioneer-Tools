'use client'

interface SaveFeedbackProps {
  message: string | null
}

export default function SaveFeedback({ message }: SaveFeedbackProps) {
  if (!message) return null

  return (
    <div className="alert alert-success">
      {message}
    </div>
  )
}
