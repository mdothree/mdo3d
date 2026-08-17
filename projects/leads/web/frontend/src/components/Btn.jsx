export default function Btn({ children, variant = 'ink', size = 'md', onClick, disabled, className = '' }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
