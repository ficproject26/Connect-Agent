import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button } from '../../components/ui';
import { ShieldCheck, ShieldAlert, Upload, FileText, CheckCircle2, Clock, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DocumentInfo {
  name: string;
  status: 'verified' | 'pending' | 'missing';
  updatedAt: string;
}

export const KycVerification: React.FC = () => {
  const { user } = useAuth();
  
  const userRegDate = user?.createdAt 
    ? new Date(user.createdAt).toISOString().split('T')[0] 
    : new Date().toISOString().split('T')[0];

  const [docs, setDocs] = useState<Record<string, DocumentInfo>>(() => ({
    aadhaar: { 
      name: 'Aadhaar Card', 
      status: user?.kycDocs?.aadhaarCard ? (user?.kycStatus === 'approved' ? 'verified' : 'pending') : 'missing', 
      updatedAt: user?.kycDocs?.aadhaarCard ? userRegDate : 'Not uploaded' 
    },
    pan: { 
      name: 'PAN Card', 
      status: user?.kycDocs?.panCard ? (user?.kycStatus === 'approved' ? 'verified' : 'pending') : 'missing', 
      updatedAt: user?.kycDocs?.panCard ? userRegDate : 'Not uploaded' 
    },
    photo: { 
      name: 'Passport Size Photo', 
      status: user?.kycDocs?.passportPhoto ? (user?.kycStatus === 'approved' ? 'verified' : 'pending') : 'missing', 
      updatedAt: user?.kycDocs?.passportPhoto ? userRegDate : 'Not uploaded' 
    },
    education: { 
      name: 'Educational Certificate', 
      status: user?.kycDocs?.educationalCertificates ? (user?.kycStatus === 'approved' ? 'verified' : 'pending') : 'missing', 
      updatedAt: user?.kycDocs?.educationalCertificates ? userRegDate : 'Not uploaded' 
    },
    bank: { 
      name: 'Bank Passbook / Cancelled Cheque', 
      status: user?.kycDocs?.cancelledCheque ? (user?.kycStatus === 'approved' ? 'verified' : 'pending') : 'missing', 
      updatedAt: user?.kycDocs?.cancelledCheque ? userRegDate : 'Not uploaded' 
    }
  }));

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleSimulateUpload = (key: string) => {
    setUploadingDoc(key);
    setTimeout(() => {
      setDocs(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          status: 'pending',
          updatedAt: new Date().toISOString().split('T')[0]
        }
      }));
      setUploadingDoc(null);
      setUploadSuccess(`Successfully uploaded ${docs[key].name}! It is now pending supervisor review.`);
      setTimeout(() => setUploadSuccess(null), 4000);
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Verified</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">Pending Review</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">Missing</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#1b1c1c] font-sans">
      {/* Header HUD */}
      <div className="bg-white p-6 rounded-[16px] border border-[#eae8e7] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-[10px] text-[#864f19] font-bold uppercase tracking-widest block">KYC Compliance Center</span>
          <h2 className="text-2xl font-black tracking-tight text-[#1b1c1c]">KYC Document Verification</h2>
          <p className="text-xs text-[#52443a] max-w-xl font-medium">
            Manage your credentials and view verification status. All onboarding agents require verified KYC to complete settlements.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 bg-[#fbf9f8] p-3 rounded-xl border border-[#eae8e7]">
          <div className="text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase block">Verification status</span>
            <span className="text-sm font-black text-[#864f19] uppercase">{user?.kycStatus || 'Verified'}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {uploadSuccess && (
        <div className="p-3.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Docs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Document verification logs status table */}
        <Card className="md:col-span-2">
          <CardHeader className="border-b border-slate-50 pb-3">
            <CardTitle className="text-sm font-extrabold text-slate-800">Your Documents Checklist</CardTitle>
          </CardHeader>
          <CardBody className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#eae8e7] bg-[#fbf9f8] text-[9px] font-black uppercase text-[#52443a] tracking-wider">
                  <th className="py-3 px-6">Document Type</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Last Updated</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eae8e7] text-xs">
                {Object.entries(docs).map(([key, doc]) => (
                  <tr key={key} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      {doc.name}
                    </td>
                    <td className="py-4 px-6">{getStatusBadge(doc.status)}</td>
                    <td className="py-4 px-6 font-semibold text-slate-500">{doc.updatedAt}</td>
                    <td className="py-4 px-6 text-right">
                      {doc.status !== 'verified' ? (
                        <Button
                          variant="secondary"
                          onClick={() => handleSimulateUpload(key)}
                          className="py-1 px-3 text-[10px] h-auto font-bold uppercase tracking-wider cursor-pointer border-none bg-[#ffdcc2] text-[#864f19] hover:bg-[#ffcca8]"
                          isLoading={uploadingDoc === key}
                          leftIcon={<Upload className="w-3 h-3" />}
                        >
                          Upload
                        </Button>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 justify-end">
                          <Check className="w-3.5 h-3.5" /> Checked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Verification guidelines */}
        <div className="bg-[#fbf9f8] p-5 rounded-[16px] border border-[#eae8e7] space-y-3">
          <h3 className="font-extrabold text-sm text-[#1b1c1c] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#864f19]" /> Onboarding Verification Rules
          </h3>
          <ul className="text-xs text-[#52443a] font-medium space-y-2 list-disc pl-4 leading-relaxed">
            <li>Submit full scanned copy of both sides of Aadhaar Card.</li>
            <li>PAN Card details must match registered applicant name exactly.</li>
            <li>The Passport Photo must be in a clear white background and under 5MB.</li>
            <li>Verification status takes up to 24–48 hours during business days.</li>
          </ul>
        </div>

        {/* Action guidelines */}
        <div className="bg-red-50/50 p-5 rounded-[16px] border border-red-100 space-y-3">
          <h3 className="font-extrabold text-sm text-[#ba1a1a] flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> Compliance Notice
          </h3>
          <p className="text-xs text-red-800/80 font-semibold leading-relaxed">
            Uploading fraudulent records or invalid certificates is a serious violation and will result in permanent account suspension and termination. Contact supervisor for document dispute assistance.
          </p>
        </div>

      </div>
    </div>
  );
};

export default KycVerification;
