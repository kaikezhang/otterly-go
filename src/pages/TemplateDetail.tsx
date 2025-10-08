import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TemplateReview {
  id: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    customName: string | null;
    picture: string | null;
    customPicture: string | null;
  };
}

interface TemplateDetail {
  id: string;
  title: string;
  destination: string;
  duration: number | null;
  templateCategory: string | null;
  estimatedBudget: string | null;
  season: string[];
  interests: string[];
  viewCount: number;
  forkCount: number;
  saveCount: number;
  avgRating: number;
  user: {
    id: string;
    name: string | null;
    customName: string | null;
    picture: string | null;
    customPicture: string | null;
  };
  coverPhoto: {
    urls: { regular: string; small: string };
    user: { name: string; links: { html: string } };
  } | null;
  reviews: TemplateReview[];
  _count: {
    reviews: number;
    forks: number;
    savedBy: number;
  };
}

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  async function fetchTemplate() {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${id}`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch template');

      const data = await response.json();
      setTemplate(data);
    } catch (error) {
      console.error('Error fetching template:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }

  async function forkTemplate() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${id}/fork`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to fork template');

      const forkedTrip = await response.json();
      navigate(`/trip/${forkedTrip.id}`);
    } catch (error) {
      console.error('Error forking template:', error);
      alert('Failed to use template. Please try again.');
    }
  }

  async function saveTemplate() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${id}/save`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'inspiration' }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save template');
      }

      alert('Template saved to your inspiration folder!');
      fetchTemplate(); // Refresh to update save count
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(error.message || 'Failed to save template');
    }
  }

  async function submitReview() {
    if (!comment.trim()) {
      alert('Please enter a review comment');
      return;
    }

    try {
      setSubmittingReview(true);
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${id}/review`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, comment }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      alert('Review submitted successfully!');
      setShowReviewForm(false);
      setRating(5);
      setComment('');
      fetchTemplate(); // Refresh to show new review
    } catch (error: any) {
      console.error('Error submitting review:', error);
      alert(error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link to="/templates" className="text-blue-600 hover:text-blue-700">← Back to Marketplace</Link>
          </div>
        </nav>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link to="/templates" className="text-blue-600 hover:text-blue-700">← Back to Marketplace</Link>
          </div>
        </nav>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600">{error || 'Template not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/templates" className="text-blue-600 hover:text-blue-700">← Back to Marketplace</Link>
          <div className="flex gap-3">
            <button
              onClick={saveTemplate}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={forkTemplate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Use Template
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Cover Photo */}
        {template.coverPhoto ? (
          <div className="relative h-96 rounded-lg overflow-hidden mb-6">
            <img
              src={template.coverPhoto.urls.regular}
              alt={template.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <h1 className="text-4xl font-bold text-white mb-2">{template.title}</h1>
              <p className="text-xl text-white/90">{template.destination}</p>
            </div>
          </div>
        ) : (
          <div className="h-96 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-lg mb-6 flex items-end p-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{template.title}</h1>
              <p className="text-xl text-white/90">{template.destination}</p>
            </div>
          </div>
        )}

        {/* Stats and Metadata */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Author and Stats */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {template.user.customPicture || template.user.picture ? (
                  <img
                    src={template.user.customPicture || template.user.picture || ''}
                    alt={template.user.customName || template.user.name || 'User'}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {(template.user.customName || template.user.name || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {template.user.customName || template.user.name}
                  </p>
                  <p className="text-sm text-gray-500">Template Creator</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="text-yellow-500">⭐</span>
                  {template.avgRating.toFixed(1)} ({template._count.reviews} reviews)
                </span>
                <span>👁️ {template.viewCount} views</span>
                <span>🍴 {template.forkCount} forks</span>
                <span>💾 {template.saveCount} saves</span>
              </div>
            </div>

            {/* Right: Metadata Tags */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
              <div className="flex flex-wrap gap-2">
                {template.duration && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {template.duration} days
                  </span>
                )}
                {template.estimatedBudget && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full capitalize">
                    {template.estimatedBudget}
                  </span>
                )}
                {template.templateCategory && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full capitalize">
                    {template.templateCategory.replace('_', ' ')}
                  </span>
                )}
                {template.season.map((s) => (
                  <span key={s} className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full capitalize">
                    {s}
                  </span>
                ))}
                {template.interests.map((i) => (
                  <span key={i} className="px-3 py-1 bg-pink-100 text-pink-700 text-sm rounded-full capitalize">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Reviews ({template._count.reviews})</h2>
            {!showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Write a Review
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Write Your Review</h3>

              {/* Star Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="text-3xl transition-colors"
                    >
                      {star <= rating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Share your experience with this template..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={submitReview}
                  disabled={submittingReview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
                <button
                  onClick={() => {
                    setShowReviewForm(false);
                    setRating(5);
                    setComment('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {template.reviews.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No reviews yet. Be the first to review this template!</p>
            ) : (
              template.reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    {review.user.customPicture || review.user.picture ? (
                      <img
                        src={review.user.customPicture || review.user.picture || ''}
                        alt={review.user.customName || review.user.name || 'User'}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                        {(review.user.customName || review.user.name || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {review.user.customName || review.user.name}
                        </p>
                        {review.isVerified && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            ✓ Verified
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span key={star} className="text-yellow-500">
                            {star <= review.rating ? '⭐' : '☆'}
                          </span>
                        ))}
                      </div>

                      {review.comment && (
                        <p className="text-gray-700 mb-2">{review.comment}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <button className="hover:text-blue-600 transition-colors">
                          👍 Helpful ({review.helpfulCount})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
