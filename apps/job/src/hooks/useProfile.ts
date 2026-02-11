// useProfile Hook - User Profile Management
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/firebase-config';
import { User, JobSeekerProfile, CompanyProfile } from '@/types/user';
import { useAuth } from './useAuth';
import { parseResume } from '@/lib/services/cvParser';
import { calculateProfileStrength, awardPoints } from '@/lib/services/pointsSystem';

export function useProfile() {
    const { user, refreshProfile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Upload CV
     */
    const uploadCV = async (file: File): Promise<void> => {
        if (!user) throw new Error('Not authenticated');

        try {
            setUploading(true);
            setError(null);

            // Validate file
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(file.type)) {
                throw new Error('Invalid file type. Please upload PDF or DOCX');
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size must be less than 5MB');
            }

            // Delete old CV if exists
            if (user.profile?.cvUrl) {
                const oldRef = ref(storage, `cvs/${user.uid}/${user.profile.cvFileName}`);
                try {
                    await deleteObject(oldRef);
                } catch (err) {
                    console.log('Old CV not found, continuing...');
                }
            }

            // Upload new CV
            const fileName = `${user.uid}_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `cvs/${user.uid}/${fileName}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Parse CV
            let parsedData;
            try {
                parsedData = await parseResume(file);
            } catch (parseError) {
                console.warn('CV parsing failed, continuing with upload:', parseError);
            }

            // Update user profile
            const updates: Partial<JobSeekerProfile> = {
                cvUrl: downloadURL,
                cvFileName: fileName,
                cvUploadedAt: new Date(),
            };

            // Add parsed data if available
            if (parsedData) {
                if (parsedData.skills.length > 0) {
                    const existingSkills = user.profile?.skills || [];
                    const newSkills = parsedData.skills;
                    updates.skills = Array.from(new Set([...existingSkills, ...newSkills]));
                }
            }

            await updateDoc(doc(db, 'users', user.uid), {
                'profile': {
                    ...user.profile,
                    ...updates,
                },
            });

            // Recalculate and update profile strength
            const newProfile = { ...user.profile, ...updates };
            const strength = calculateProfileStrength({ profile: newProfile });
            await updateDoc(doc(db, 'users', user.uid), {
                'profile.profileStrength': strength,
            });

            // Award points for CV upload
            await awardPoints(user.uid, 15, 'CV uploaded');

            await refreshProfile();
        } catch (err: any) {
            setError(err.message || 'Failed to upload CV');
            throw err;
        } finally {
            setUploading(false);
        }
    };

    /**
     * Upload intro video
     */
    const uploadVideo = async (file: File): Promise<void> => {
        if (!user) throw new Error('Not authenticated');

        try {
            setUploading(true);
            setError(null);

            // Validate file
            const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
            if (!validTypes.includes(file.type)) {
                throw new Error('Invalid file type. Please upload MP4, WebM, or MOV');
            }

            if (file.size > 50 * 1024 * 1024) {
                throw new Error('Video size must be less than 50MB');
            }

            // Delete old video if exists
            if (user.profile?.videoUrl) {
                const oldRef = ref(storage, `videos/${user.uid}/${user.profile.videoFileName}`);
                try {
                    await deleteObject(oldRef);
                } catch (err) {
                    console.log('Old video not found, continuing...');
                }
            }

            // Upload new video
            const fileName = `${user.uid}_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `videos/${user.uid}/${fileName}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update user profile
            const updates = {
                videoUrl: downloadURL,
                videoFileName: fileName,
                videoUploadedAt: new Date(),
            };

            await updateDoc(doc(db, 'users', user.uid), {
                'profile.videoUrl': downloadURL,
                'profile.videoFileName': fileName,
                'profile.videoUploadedAt': new Date(),
            });

            // Recalculate and update profile strength
            const updatedProfile = {
                ...user.profile,
                ...updates
            };
            const strength = calculateProfileStrength({ profile: updatedProfile });
            await updateDoc(doc(db, 'users', user.uid), {
                'profile.profileStrength': strength,
            });

            // Award points for video upload
            await awardPoints(user.uid, 20, 'Intro video uploaded');

            await refreshProfile();
        } catch (err: any) {
            setError(err.message || 'Failed to upload video');
            throw err;
        } finally {
            setUploading(false);
        }
    };

    /**
     * Update job seeker profile
     */
    const updateJobSeekerProfile = async (updates: Partial<JobSeekerProfile>): Promise<void> => {
        if (!user) throw new Error('Not authenticated');

        try {
            setError(null);

            await updateDoc(doc(db, 'users', user.uid), {
                'profile': {
                    ...user.profile,
                    ...updates,
                },
                updatedAt: new Date(),
            });

            // Recalculate profile strength
            const strength = calculateProfileStrength({
                ...user,
                profile: {
                    ...user.profile!,
                    ...updates,
                }
            } as User);

            await updateDoc(doc(db, 'users', user.uid), {
                'profile.profileStrength': strength,
            });

            await refreshProfile();
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
            throw err;
        }
    };

    /**
     * Update company profile (for employers)
     */
    const updateCompanyProfile = async (updates: Partial<CompanyProfile>): Promise<void> => {
        if (!user) throw new Error('Not authenticated');

        try {
            setError(null);

            await updateDoc(doc(db, 'users', user.uid), {
                'company': {
                    ...user.company,
                    ...updates,
                },
                updatedAt: new Date(),
            });

            await refreshProfile();
        } catch (err: any) {
            setError(err.message || 'Failed to update company profile');
            throw err;
        }
    };

    /**
     * Upload company logo
     */
    const uploadCompanyLogo = async (file: File): Promise<void> => {
        if (!user) throw new Error('Not authenticated');

        try {
            setUploading(true);
            setError(null);

            // Validate file
            const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                throw new Error('Invalid file type. Please upload JPG, PNG, or WebP');
            }

            if (file.size > 2 * 1024 * 1024) {
                throw new Error('Image size must be less than 2MB');
            }

            // Upload logo
            const fileName = `${user.uid}_${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `logos/${user.uid}/${fileName}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // Update company profile
            await updateDoc(doc(db, 'users', user.uid), {
                'company.logo': downloadURL,
                updatedAt: new Date(),
            });

            await refreshProfile();
        } catch (err: any) {
            setError(err.message || 'Failed to upload logo');
            throw err;
        } finally {
            setUploading(false);
        }
    };

    return {
        user,
        uploading,
        error,
        uploadCV,
        uploadVideo,
        updateJobSeekerProfile,
        updateCompanyProfile,
        uploadCompanyLogo,
    };
}