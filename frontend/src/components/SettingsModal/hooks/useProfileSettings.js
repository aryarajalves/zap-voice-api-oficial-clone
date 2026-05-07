import { useState } from 'react';

export const INITIAL_PROFILE_STATE = {
    email: '',
    full_name: '',
    password: ''
};

export function useProfileSettings() {
    const [profileData, setProfileData] = useState(INITIAL_PROFILE_STATE);
    const [showPassword, setShowPassword] = useState(false);

    const handleProfileChange = (e) => {
        setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return {
        profileData, setProfileData,
        showPassword, setShowPassword,
        handleProfileChange
    };
}
