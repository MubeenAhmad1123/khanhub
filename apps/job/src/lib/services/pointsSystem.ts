export interface ProfileData {
  profile?: {
    skills?: string[];
    yearsOfExperience?: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    cvUrl?: string;
    education?: any[];
    certifications?: any[];
  };
}

export const calculateProfileStrength = (userData: ProfileData): number => {
  if (!userData?.profile) return 0;

  const { profile } = userData;
  let points = 0;

  // Basic info (assumed present if profile exists)
  points += 20;

  // Skills
  if (profile.skills && profile.skills.length > 0) points += 20;

  // Experience
  if (profile.yearsOfExperience !== undefined) points += 15;

  // Video
  if (profile.videoUrl || profile.thumbnailUrl) points += 25;

  // CV/Resume
  if (profile.cvUrl) points += 10;

  // Education/Certifications
  if ((profile.education && profile.education.length > 0) ||
    (profile.certifications && profile.certifications.length > 0)) {
    points += 10;
  }

  return Math.min(points, 100);
};

export const awardPoints = async (userId: string, points: number, reason: string) => {
  console.log(`Awarding ${points} points to ${userId} for ${reason}`);
  return true;
};

export const awardPointsForVideo = async (userId: string) => {
  return awardPoints(userId, 20, 'video_upload');
};

export const getStrengthColor = (strength: number): string => {
  if (strength >= 80) return 'text-green-500';
  if (strength >= 50) return 'text-blue-500';
  if (strength >= 30) return 'text-yellow-500';
  return 'text-red-500';
};

export const getStrengthLabel = (strength: number): string => {
  if (strength >= 80) return 'Excellent';
  if (strength >= 50) return 'Good';
  if (strength >= 30) return 'Fair';
  return 'Weak';
};
