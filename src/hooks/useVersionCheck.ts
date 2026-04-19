import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const LOCAL_VERSION_KEY = 'ggform-app-version';

export const useVersionCheck = () => {
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'version')
        .maybeSingle();

      if (!data) return;

      const remoteVersion = data.value;
      const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);

      if (localVersion !== remoteVersion) {
        localStorage.setItem(LOCAL_VERSION_KEY, remoteVersion);
        window.location.reload();
      }
    };

    check();
  }, []);
};
