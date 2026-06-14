import ProfileDesktopView from "@/src/components/home/profile/ProfileDesktopView";
import ProfileMobileView from "@/src/components/home/profile/ProfileMobileView";

export default function ProfilePage() {
  return (
    <div className="w-full min-h-screen bg-gray-50/50">
      <ProfileDesktopView />
      <ProfileMobileView />
    </div>
  );
}
