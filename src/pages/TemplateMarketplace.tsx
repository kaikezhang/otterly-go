import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Template {
  id: string;
  title: string;
  destination: string;
  duration: number | null;
  templateCategory: string | null;
  estimatedBudget: string | null;
  viewCount: number;
  forkCount: number;
  saveCount: number;
  avgRating: number;
  reviewCount: number;
  user: {
    id: string;
    name: string | null;
    customName: string | null;
  };
  coverPhoto: {
    urls: { small: string };
  } | null;
}

export default function TemplateMarketplace() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('trending');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, [sortBy]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/templates?sortBy=${sortBy}&limit=20`,
        { credentials: 'include' }
      );

      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function forkTemplate(templateId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/templates/${templateId}/fork`,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-700">← Back to Dashboard</Link>
          </div>
        </nav>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold">Template Marketplace</h1>
          <div></div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Sort Controls */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600">{templates.length} templates found</p>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="trending">Trending</option>
            <option value="popular">Most Popular</option>
            <option value="mostSaved">Most Saved</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No templates found. Be the first to create one!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Cover Photo */}
                {template.coverPhoto ? (
                  <img
                    src={template.coverPhoto.urls.small}
                    alt={template.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-indigo-600"></div>
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{template.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{template.destination}</p>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {template.duration && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {template.duration} days
                      </span>
                    )}
                    {template.estimatedBudget && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded capitalize">
                        {template.estimatedBudget}
                      </span>
                    )}
                    {template.templateCategory && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded capitalize">
                        {template.templateCategory.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>⭐ {template.avgRating.toFixed(1)} ({template.reviewCount})</span>
                    <span>👁️ {template.viewCount}</span>
                    <span>🍴 {template.forkCount}</span>
                  </div>

                  {/* Author */}
                  <p className="text-xs text-gray-500 mb-3">
                    by {template.user.customName || template.user.name}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => forkTemplate(template.id)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Use Template
                    </button>
                    <Link
                      to={`/template/${template.id}`}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
