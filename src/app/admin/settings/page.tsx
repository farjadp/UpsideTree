import { createClient } from '@/utils/supabase/server';
import GeneralSettingsForm from './GeneralSettingsForm';

export const metadata = {
  title: 'General Settings - Admin',
};

export default async function GeneralSettingsPage() {
  const supabase = await createClient();

  // Fetch only the 'general' namespace settings
  const { data: settingsData, error } = await supabase
    .from('settings')
    .select('*')
    .eq('namespace', 'general');

  if (error) {
    console.error('Error fetching general settings:', error);
  }

  // Format array to key-value object
  const settings = settingsData?.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting;
    return acc;
  }, {}) || {};

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">General Settings</h2>
        <p className="text-slate-400 text-sm mt-1">
          Manage your store's basic information and preferences.
        </p>
      </div>

      <GeneralSettingsForm initialSettings={settings} />
    </div>
  );
}
