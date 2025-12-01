import { Alert } from "react-native";

export const handleApiError = (
  error: any,
  defaultMessage: string = "An error occurred"
): string => {
  console.error(error);
  
  const errorMessage =
    error.response?.data?.message ||
    error.message ||
    defaultMessage;
  
  return errorMessage;
};

export const showApiError = (
  error: any,
  defaultMessage: string = "An error occurred",
  title: string = "Error"
) => {
  const message = handleApiError(error, defaultMessage);
  Alert.alert(title, message);
};
