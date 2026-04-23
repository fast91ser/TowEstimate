export function Card({ className = '', ...props }) {
  return <div className={className} {...props} />
}

export function CardHeader({ className = '', ...props }) {
  return <div className={`p-6 pb-0 ${className}`.trim()} {...props} />
}

export function CardTitle({ className = '', ...props }) {
  return <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`.trim()} {...props} />
}

export function CardContent({ className = '', ...props }) {
  return <div className={`p-6 ${className}`.trim()} {...props} />
}
