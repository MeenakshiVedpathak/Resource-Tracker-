import { Outlet } from 'react-router-dom';
import { ForgotPasswordProvider } from '@/contexts/ForgotPasswordContext';

// Wraps the three Forgot Password routes (Email/OTP/Reset) in one shared, in-memory-only
// state provider — mounted once when entering any of the three, unmounted (and cleared)
// when leaving all three, e.g. navigating to Login.
const ForgotPasswordLayout = () => (
  <ForgotPasswordProvider>
    <Outlet />
  </ForgotPasswordProvider>
);

export default ForgotPasswordLayout;
