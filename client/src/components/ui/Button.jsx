import { forwardRef } from 'react';

const Button = forwardRef(function Button({ variant = 'primary', size, type = 'button', className = '', children, ...props }, ref) {
  const cls = ['btn', variant !== 'primary' ? variant : '', size || '', className].filter(Boolean).join(' ');
  return <button ref={ref} type={type} className={cls} {...props}>{children}</button>;
});
export default Button;
