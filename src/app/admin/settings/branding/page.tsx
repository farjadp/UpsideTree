import { createClient } from '@/utils/supabase/server';
import BrandingSettingsForm from './BrandingSettingsForm';

export const metadata = {
  title: 'Branding Settings - Admin',
};

export default async function BrandingSettingsPage() {
  const supabase = await createClient();

  // Fetch 'branding' namespace settings
  const { data: settingsData, error } = await supabase
    .from('settings')
    .select('*')
    .eq('namespace', 'branding');

  if (error) {
    console.error('Error fetching branding settings:', error);
  }

  // Format array to key-value object
  const settings = settingsData?.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting;
    return acc;
  }, {}) || {};

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white">Branding Settings</h2>
        <p className="text-slate-400 text-sm mt-1">
          Customize your store's appearance, colors, and typography.
        </p>
      </div>

      <BrandingSettingsForm initialSettings={settings} />
    </div>
  );
}
