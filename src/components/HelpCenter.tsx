import React, { useState } from 'react';
import { BookOpen, FileText, HelpCircle, Keyboard, Video, Search, X } from 'lucide-react';
import GettingStarted from './help/GettingStarted';
import FAQ from './help/FAQ';
import FeatureGuides from './help/FeatureGuides';
import KeyboardShortcuts from './help/KeyboardShortcuts';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'home' | 'getting-started' | 'features' | 'faq' | 'shortcuts' | 'videos';

export function HelpCenter({ isOpen, onClose }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: BookOpen },
    { id: 'getting-started' as TabType, label: 'Getting Started', icon: FileText },
    { id: 'features' as TabType, label: 'Feature Guides', icon: BookOpen },
    { id: 'faq' as TabType, label: 'FAQ', icon: HelpCircle },
    { id: 'shortcuts' as TabType, label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'videos' as TabType, label: 'Video Tutorials', icon: Video },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to the Help Center</h3>
              <p className="text-gray-600">
                Find everything you need to get started and make the most of the SCS Quotation System.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tabs.slice(1).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-start gap-4 p-5 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <tab.icon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{tab.label}</h4>
                    <p className="text-sm text-gray-600">
                      {tab.id === 'getting-started' && 'Learn the basics and get up to speed quickly'}
                      {tab.id === 'features' && 'Detailed guides for all system features'}
                      {tab.id === 'faq' && 'Answers to commonly asked questions'}
                      {tab.id === 'shortcuts' && 'Speed up your workflow with keyboard shortcuts'}
                      {tab.id === 'videos' && 'Watch tutorial videos and walkthroughs'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-bold text-blue-900 mb-3">Quick Links</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('getting-started')}
                  className="block text-blue-700 hover:text-blue-900 hover:underline text-sm"
                >
                  → How do I create my first quotation?
                </button>
                <button
                  onClick={() => setActiveTab('features')}
                  className="block text-blue-700 hover:text-blue-900 hover:underline text-sm"
                >
                  → How do I use the Component Library?
                </button>
                <button
                  onClick={() => setActiveTab('faq')}
                  className="block text-blue-700 hover:text-blue-900 hover:underline text-sm"
                >
                  → How do I share quotations with team members?
                </button>
                <button
                  onClick={() => setActiveTab('shortcuts')}
                  className="block text-blue-700 hover:text-blue-900 hover:underline text-sm"
                >
                  → What keyboard shortcuts are available?
                </button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h4 className="font-bold text-gray-900 mb-2">Need More Help?</h4>
              <p className="text-gray-700 text-sm">
                If you can't find what you're looking for in the help documentation, please contact your
                system administrator or IT support team for assistance.
              </p>
            </div>
          </div>
        );

      case 'getting-started':
        return <GettingStarted />;

      case 'features':
        return <FeatureGuides searchQuery={searchQuery} />;

      case 'faq':
        return <FAQ searchQuery={searchQuery} />;

      case 'shortcuts':
        return <KeyboardShortcuts />;

      case 'videos':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Video Tutorials</h3>
              <p className="text-gray-600">
                Watch step-by-step video tutorials to learn how to use the system effectively.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h4 className="font-bold text-yellow-900 mb-2">Coming Soon</h4>
              <p className="text-yellow-800 text-sm">
                Video tutorials are currently being prepared. Check back soon for comprehensive video
                guides covering all major features of the system.
              </p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Getting Started Tutorial</h4>
                    <p className="text-sm text-gray-600">Learn the basics of creating your first quotation</p>
                    <p className="text-xs text-gray-500 mt-2">Coming soon</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Component Library Guide</h4>
                    <p className="text-sm text-gray-600">How to save and reuse common line items</p>
                    <p className="text-xs text-gray-500 mt-2">Coming soon</p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 opacity-50">
                <div className="flex items-start gap-4">
                  <div className="w-32 h-20 bg-gray-200 rounded flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">Advanced Features</h4>
                    <p className="text-sm text-gray-600">Sharing, revisions, and collaboration</p>
                    <p className="text-xs text-gray-500 mt-2">Coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-700 to-green-800">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Help Center</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-4 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-green-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(activeTab === 'features' || activeTab === 'faq') && (
              <div className="p-6 pb-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTab === 'features' ? 'feature guides' : 'FAQs'}...`}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )}

            <div className="p-6">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
