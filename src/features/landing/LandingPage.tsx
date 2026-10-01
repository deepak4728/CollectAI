import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Layers,
  ArrowRight,
  Headphones,
  MessageSquare,
  FileCheck2,
  Building2,
  Sparkles,
  ShieldCheck,
  Check,
  Utensils,
  Award,
} from 'lucide-react';

interface LandingPageProps {
  onOpenPublicLink: (slug: string) => void;
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenPublicLink, onEnterApp }) => {
  const { allOrgs, refreshOrgs, switchDemoUser } = useAuth();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('healthcare');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createOrganization({
        name: orgName,
        industry,
        plan: 'professional',
        adminName,
        adminEmail,
      });
      await refreshOrgs();
      setShowRegisterModal(false);
      onEnterApp();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-gray-900">CollectAI</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                Universal Engine
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-indigo-600 transition"
            >
              Register Organization
            </button>
            <button
              onClick={onEnterApp}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center space-x-1.5"
            >
              <span>Enter Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Universal AI-Driven Data Collection Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Define the requirement once.
            <br />
            <span className="text-indigo-600">Let AI collect, validate, structure & export.</span>
          </h1>

          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Not just a form builder or a survey tool. CollectAI is a re-usable data collection engine powering government service centers, restaurants, clinics, schools, and enterprise intake.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onEnterApp}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center space-x-2"
            >
              <span>Open Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenPublicLink('jaipur-bistro-order')}
              className="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-lg shadow-2xs transition flex items-center space-x-2"
            >
              <Utensils className="w-4 h-4 text-amber-600" />
              <span>Try Restaurant Demo Order</span>
            </button>

            <button
              onClick={() => onOpenPublicLink('csc-citizen-service')}
              className="px-5 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-bold rounded-lg shadow-2xs transition flex items-center space-x-2"
            >
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Try CSC Citizen Demo</span>
            </button>
          </div>
        </div>

        {/* 3 Collection Modes Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">1. B2B Enterprise Schemas</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Define versioned schemas, 19+ field types, regex validation, derived math formulas, and conditional questions visually or with AI generation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">2. Operator-Assisted Mode</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              CSC staff, waiters, and intake operators type multi-field spoken sentences. The engine populates structured fields, highlights missing data, and confirms totals.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">3. Direct-to-Person Links</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Customers complete a public link using an AI conversation or switch to dynamic forms on the fly without losing collected information.
            </p>
          </div>
        </div>

        {/* Architectural Principles Box */}
        <div className="bg-slate-900 rounded-xl p-8 text-white shadow-sm border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Deterministic Reliability Guarantee</span>
          </div>
          <h2 className="text-lg font-bold">Never rely on LLM alone for business rules & calculations.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs text-slate-300">
            <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700">
              <span className="font-bold text-white block">Required-Field Checks</span>
              Deterministic engine evaluates visibility and missing values.
            </div>
            <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700">
              <span className="font-bold text-white block">Math Calculations</span>
              Taxes, discounts, and age calculations execute in code.
            </div>
            <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700">
              <span className="font-bold text-white block">Tenant Isolation</span>
              Every database record strictly scoped by organization ID.
            </div>
            <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700">
              <span className="font-bold text-white block">Server Gemini Proxy</span>
              Zero exposed keys. Server handles structured JSON extraction.
            </div>
          </div>
        </div>
      </main>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Register New Organization Tenant</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Apex Hospital, Apex School, Metro Realty"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Industry Vertical</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden"
                >
                  <option value="healthcare">Healthcare & Clinics</option>
                  <option value="education">Schools & Admissions</option>
                  <option value="real_estate">Property & Brokerage</option>
                  <option value="government_csc">Government & Citizen Services</option>
                  <option value="food_hospitality">Food & Hospitality</option>
                  <option value="general">General Business Enquiries</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Admin Full Name</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Dr. Alok Gupta"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@organization.com"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Creating Tenant...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400 bg-white">
        CollectAI Universal SaaS Platform • Production-grade Architecture
      </footer>
    </div>
  );
};
