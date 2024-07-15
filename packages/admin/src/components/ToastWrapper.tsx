import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";

export const ToastWrapper = () => {
  const { theme } = useTheme()

  return (
    <ToastContainer 
      position="bottom-right" 
      theme={theme}
    />
  );
};