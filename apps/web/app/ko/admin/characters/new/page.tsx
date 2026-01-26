'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Upload } from 'lucide-react';

export default function NewCharacterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    occupation: '',
    description: '',
    backstory: '',
    voiceId: 'default',
    personalityOpenness: '50',
    personalityWarmth: '50',
    personalityPlayfulness: '50',
    personalityMysteriousness: '50',
    tags: '',
    profileImage: '',
    thumbnailUrl: '',
    previewVideoUrl: '',
    isPublished: false,
    isNew: true,
    isTrending: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          age: parseInt(formData.age),
          occupation: formData.occupation,
          description: formData.description,
          backstory: formData.backstory,
          voiceId: formData.voiceId,
          personality: {
            openness: parseInt(formData.personalityOpenness),
            warmth: parseInt(formData.personalityWarmth),
            playfulness: parseInt(formData.personalityPlayfulness),
            mysteriousness: parseInt(formData.personalityMysteriousness),
          },
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          profileImage: formData.profileImage,
          thumbnailUrl: formData.thumbnailUrl,
          previewVideoUrl: formData.previewVideoUrl || null,
          isPublished: formData.isPublished,
          isNew: formData.isNew,
          isTrending: formData.isTrending,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create character');
      }

      alert('캐릭터가 성공적으로 생성되었습니다!');
      router.push('/ko/admin');
    } catch (error) {
      console.error('Error creating character:', error);
      alert('캐릭터 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/ko/admin"
                className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <h1 className="text-lg sm:text-xl font-bold text-white">새 캐릭터 추가</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4">기본 정보</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  이름 *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
                  placeholder="캐릭터 이름"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    나이 *
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
                    placeholder="25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                    직업 *
                  </label>
                  <input
                    type="text"
                    name="occupation"
                    value={formData.occupation}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
                    placeholder="디자이너"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
                  placeholder="친근한, 활발한, 긍정적인"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4">이미지</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  프로필 이미지 URL
                </label>
                <input
                  type="url"
                  name="profileImage"
                  value={formData.profileImage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  썸네일 이미지 URL
                </label>
                <input
                  type="url"
                  name="thumbnailUrl"
                  value={formData.thumbnailUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Character Details */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4">캐릭터 상세</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  설명 *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B] resize-none"
                  placeholder="캐릭터 설명..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  배경 스토리 *
                </label>
                <textarea
                  name="backstory"
                  value={formData.backstory}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B] resize-none"
                  placeholder="캐릭터의 배경 스토리..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  음성 ID
                </label>
                <input
                  type="text"
                  name="voiceId"
                  value={formData.voiceId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
                  placeholder="default"
                />
              </div>
            </div>
          </div>

          {/* Personality Traits */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4">성격 특성 (0-100)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  개방성 (Openness): {formData.personalityOpenness}
                </label>
                <input
                  type="range"
                  name="personalityOpenness"
                  min="0"
                  max="100"
                  value={formData.personalityOpenness}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  따뜻함 (Warmth): {formData.personalityWarmth}
                </label>
                <input
                  type="range"
                  name="personalityWarmth"
                  min="0"
                  max="100"
                  value={formData.personalityWarmth}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  장난기 (Playfulness): {formData.personalityPlayfulness}
                </label>
                <input
                  type="range"
                  name="personalityPlayfulness"
                  min="0"
                  max="100"
                  value={formData.personalityPlayfulness}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  신비로움 (Mysteriousness): {formData.personalityMysteriousness}
                </label>
                <input
                  type="range"
                  name="personalityMysteriousness"
                  min="0"
                  max="100"
                  value={formData.personalityMysteriousness}
                  onChange={handleChange}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-bold text-white mb-4">상태 설정</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#FF6B6B] focus:ring-[#FF6B6B] focus:ring-offset-0"
                />
                <span className="text-white">공개</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isNew"
                  checked={formData.isNew}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#FF6B6B] focus:ring-[#FF6B6B] focus:ring-offset-0"
                />
                <span className="text-white">신규 표시</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isTrending"
                  checked={formData.isTrending}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-[#2A2A2A] bg-[#0A0A0A] text-[#FF6B6B] focus:ring-[#FF6B6B] focus:ring-offset-0"
                />
                <span className="text-white">인기 표시</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#FF6B6B] text-white rounded-lg hover:bg-[#FF5252] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? '생성 중...' : '캐릭터 생성'}</span>
            </button>
            <Link
              href="/ko/admin"
              className="flex-1 sm:flex-none px-6 py-3 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-colors text-center font-medium"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
