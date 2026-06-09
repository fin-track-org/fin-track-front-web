import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMySetting, updateLedgerMode, updateLedgerTheme } from "@/src/lib/api/userSettingApi";
import { useToast } from "@/src/hook/useToast";

export const USER_SETTING_QUERY_KEY = ["userSetting"];

export const useUserSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: userSetting,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: USER_SETTING_QUERY_KEY,
    queryFn: fetchMySetting,
  });

  const { mutate: changeLedgerMode, isPending: isUpdating } = useMutation({
    mutationFn: (newMode: LedgerMode) => updateLedgerMode({ ledgerMode: newMode }),
    onSuccess: (updatedSetting) => {
      queryClient.setQueryData(USER_SETTING_QUERY_KEY, updatedSetting);
      toast.success("가계부 모드가 변경되었습니다.");
    },
    onError: (err: any) => {
      toast.error(err.message || "가계부 모드 변경에 실패했습니다.");
    },
  });

  const { mutate: changeLedgerTheme, isPending: isThemeUpdating } = useMutation({
    mutationFn: (newTheme: LedgerTheme) => updateLedgerTheme({ ledgerTheme: newTheme }),
    onSuccess: (updatedSetting) => {
      queryClient.setQueryData(USER_SETTING_QUERY_KEY, updatedSetting);
      toast.success("가계부 테마가 변경되었습니다.");
    },
    onError: (err: any) => {
      toast.error(err.message || "가계부 테마 변경에 실패했습니다.");
    },
  });

  return {
    userSetting,
    isLoading,
    isError,
    error,
    changeLedgerMode,
    isUpdating,
    changeLedgerTheme,
    isThemeUpdating,
  };
};
