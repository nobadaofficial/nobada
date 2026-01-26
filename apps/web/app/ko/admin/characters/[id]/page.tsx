'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';

interface PersonalityTraits {
  openness: number;
  warmth: number;
  playfulness: number;
  mysteriousness: number;
}

interface Character {
  id: string;
  name: string;
  age: number;
  occupation: string;
  description: string;
  backstory: string;
  voiceId: string;
  personality: PersonalityTraits;
  tags: string[];
  profileImage: string;
  thumbnailUrl: string;
  previewVideoUrl?: string;
  isPublished: boolean;
  isNew: boolean;
  isTrending: boolean;
}

export default function EditCharacterPage() {
  const router = useRouter();
  const params = useParams();
  const characterId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Character | null>(null);

  useEffect(() => {
    fetchCharacter();
  }, [characterId]);

  const fetchCharacter = async () => {
    try {
      const response = await fetch(`/api/admin/characters/${characterId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch character');
      }

      const data = await response.json();
      setFormData(data.character);
    } catch (error) {
      console.error('Error fetching character:', error);
      alert('캐릭터를 불러오는데 실패했습니다.');
      router.push('/ko/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update character');
      }

      alert('캐릭터가 성공적으로 수정되었습니다!');
      router.push('/ko/admin');
    } catch (error) {
      console.error('Error updating character:', error);
      alert('캐릭터 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 캐릭터를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete character');
      }

      alert('캐릭터가 삭제되었습니다.');
      router.push('/ko/admin');
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('캐릭터 삭제에 실패했습니다.');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!formData) return;

    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => {
      if (!prev) return prev;

      if (name === 'tags') {
        return {
          ...prev,
          tags: value.split(',').map(tag => tag.trim()).filter(Boolean),
        };
      }

      if (name === 'age') {
        return {
          ...prev,
          age: parseInt(value) || 0,
        };
      }

      return {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
    });
  };

  const handlePersonalityChange = (trait: keyof PersonalityTraits, value: number) => {
    if (!formData) return;

    setFormData(prev => prev ? {
      ...prev,
      personality: {
        ...prev.personality,
        [trait]: value,
      },
    } : null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

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
              <h1 className="text-lg sm:text-xl font-bold text-white">캐릭터 수정</h1>
            </div>
            <button
              onClick={handleDelete}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
              title="삭제"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
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
                  value={formData.tags.join(', ')}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  프리뷰 비디오 URL
                </label>
                <input
                  type="url"
                  name="previewVideoUrl"
                  value={formData.previewVideoUrl || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[#FF6B6B]"
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
                  개방성 (Openness): {formData.personality.openness}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.personality.openness}
                  onChange={(e) => handlePersonalityChange('openness', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  따뜻함 (Warmth): {formData.personality.warmth}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.personality.warmth}
                  onChange={(e) => handlePersonalityChange('warmth', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  장난기 (Playfulness): {formData.personality.playfulness}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.personality.playfulness}
                  onChange={(e) => handlePersonalityChange('playfulness', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#9CA3AF] mb-2">
                  신비로움 (Mysteriousness): {formData.personality.mysteriousness}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.personality.mysteriousness}
                  onChange={(e) => handlePersonalityChange('mysteriousness', parseInt(e.target.value))}
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
              <span>{isSubmitting ? '저장 중...' : '저장'}</span>
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
