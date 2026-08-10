import React, { useState } from 'react';
import { Modal, Button, Input, Select } from '../../components/ui';
import {
  Building, User, FileText, Landmark, CheckCircle2, ChevronRight, ChevronLeft,
  Upload, Eye, EyeOff, X, AlertCircle, ShieldCheck, Check, Info, FileCode, Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OnboardVendorWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vendorData: any) => void;
}

export const OnboardVendorWizardModal: React.FC<OnboardVendorWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Show/hide password states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Business Info
  const [formData, setFormData] = useState({
    // Step 1
    businessName: '',
    category: 'Supermarket & Retail',
    customCategory: '',
    phone: '',
    email: '',
    fullAddress: '',
    pincode: user?.territory?.pincode || '636112',
    state: user?.territory?.state || 'Tamil Nadu',
    district: user?.territory?.district || 'Salem',
    division: user?.territory?.division || 'Attur Division',
    postOffice: 'Attur Head Post Office',
    operatingHours: '09:00 AM - 09:00 PM',
    website: '',
    logoUrl: '',
    logoFileName: '',
    businessImages: [] as { id: string; url: string; name: string }[],

    // Step 2
    ownerName: '',
    alternatePhone: '',
    agentCode: user?.name ? `${user.name} (${user.registrationId || 'AGENT-REF'})` : 'Self Registered',
    copartnerName: '',
    password: '',
    confirmPassword: '',

    // Step 3
    panNumber: '',
    aadhaarNumber: '',
    businessLicenseName: '',
    businessLicenseUrl: '',
    gstStatus: 'Non-GST Declared' as 'Non-GST Declared' | 'GST Registered',
    gstNumber: '',
    msmeStatus: 'Non-MSME' as 'Non-MSME' | 'Micro Enterprise' | 'Small Enterprise' | 'Medium Enterprise',

    // Step 4
    accountHolderName: '',
    bankName: 'State Bank of India',
    branch: '',
    bankStreetAddress: '',
    bankCity: '',
    accountNumber: '',
    ifscCode: '',

    // Step 5 Declarations
    bankAccurateDeclared: false,
    termsAccepted: false
  });

  // Pincode auto-lookup handler
  const handlePincodeChange = (pin: string) => {
    const cleaned = pin.replace(/\D/g, '').slice(0, 6);
    let state = formData.state;
    let division = formData.division;
    let district = formData.district;
    let postOffice = formData.postOffice;

    if (cleaned.length === 6) {
      const firstDigit = cleaned.charAt(0);
      const prefixTwo = parseInt(cleaned.slice(0, 2), 10);

      if (firstDigit === '1') {
        if (prefixTwo === 11) {
          state = "Delhi"; division = "Delhi Division"; district = "New Delhi";
        } else if (prefixTwo >= 12 && prefixTwo <= 13) {
          state = "Haryana"; division = "Gurugram Division"; district = "Gurugram";
        } else {
          state = "Punjab"; division = "Ludhiana Division"; district = "Ludhiana";
        }
      } else if (firstDigit === '4') {
        state = "Maharashtra"; division = "Mumbai Division"; district = "Mumbai Suburban";
      } else if (firstDigit === '5') {
        state = "Karnataka"; division = "Bengaluru South"; district = "Bengaluru Urban";
      } else if (firstDigit === '6') {
        state = "Tamil Nadu"; division = "Hosur Division"; district = "Krishnagiri District";
      }
      postOffice = `Post Office PIN-${cleaned}`;
    }

    setFormData(prev => ({
      ...prev,
      pincode: cleaned,
      state,
      division,
      district,
      postOffice
    }));
  };

  // Handle Logo Upload Validation
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Logo file size must be less than 5MB.');
      return;
    }
    setErrorMsg('');

    const reader = new FileReader();
    reader.onerror = (err) => console.warn('Logo file reader error:', err);
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setFormData(prev => ({
          ...prev,
          logoUrl: ev.target!.result as string,
          logoFileName: file.name
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Multi Business Images Upload (up to 5)
  const handleBusinessImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (formData.businessImages.length + files.length > 5) {
      setErrorMsg('You can upload a maximum of 5 business shop images.');
      return;
    }
    setErrorMsg('');

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onerror = (err) => console.warn('Business image file reader error:', err);
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setFormData(prev => ({
            ...prev,
            businessImages: [
              ...prev.businessImages,
              { id: `IMG-${Date.now()}-${Math.random()}`, url: ev.target!.result as string, name: file.name }
            ]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove Business Image
  const removeBusinessImage = (imgId: string) => {
    setFormData(prev => ({
      ...prev,
      businessImages: prev.businessImages.filter(img => img.id !== imgId)
    }));
  };

  // Handle Business License Upload
  const handleLicenseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Document file size must be under 10MB.');
      return;
    }
    setErrorMsg('');

    setFormData(prev => ({
      ...prev,
      businessLicenseName: file.name,
      businessLicenseUrl: URL.createObjectURL(file)
    }));
  };

  // Password Checklist validation
  const passwordCriteria = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    match: formData.password !== '' && formData.password === formData.confirmPassword
  };

  // Validation logic per step
  const validateStep1 = () => {
    if (!formData.businessName.trim()) return 'Business / Shop Name is required.';
    if (!formData.phone || formData.phone.length !== 10) return 'Business Phone Number must be a valid 10-digit mobile number.';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Valid Email Address is required.';
    if (!formData.fullAddress.trim()) return 'Business Street Address is required.';
    if (!formData.pincode || formData.pincode.length !== 6) return 'Valid 6-digit Postal Code (Pincode) is required.';
    if (!formData.logoUrl) return 'Shop / Brand Logo is required. Please upload your shop logo image.';
    return '';
  };

  const validateStep2 = () => {
    if (!formData.ownerName.trim()) return 'Owner / Contact Person Name is required.';
    if (formData.alternatePhone && formData.alternatePhone.length !== 10) return 'Alternate Phone Number must be 10 digits.';
    if (!formData.password) return 'Account Password is required.';
    if (!passwordCriteria.length || !passwordCriteria.uppercase || !passwordCriteria.number) {
      return 'Password does not meet required criteria (min 8 chars, 1 uppercase, 1 number).';
    }
    if (!passwordCriteria.match) return 'Passwords do not match.';
    return '';
  };

  const validateStep3 = () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!formData.panNumber || !panRegex.test(formData.panNumber.toUpperCase())) {
      return 'Valid 10-character PAN Number (e.g. ABCDE1234F) is required.';
    }
    const aadhaarClean = formData.aadhaarNumber.replace(/\D/g, '');
    if (aadhaarClean.length !== 12) {
      return 'Valid 12-digit Aadhaar Number is required.';
    }
    if (!formData.businessLicenseName) {
      return 'Business License / Registration Document upload is required.';
    }
    if (formData.gstStatus === 'GST Registered') {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9a-zA-Z]{1}$/;
      if (!formData.gstNumber || !gstRegex.test(formData.gstNumber.toUpperCase())) {
        return 'Valid 15-character GSTIN Number (e.g. 33AABCK1234F1Z9) is required when GST Registered is selected.';
      }
    }
    return '';
  };

  const validateStep4 = () => {
    if (!formData.accountHolderName.trim()) return 'Account Holder Name is required.';
    if (!formData.branch.trim()) return 'Bank Branch Name is required.';
    if (!formData.bankStreetAddress.trim() || !formData.bankCity.trim()) return 'Bank Address and City are required.';
    if (!formData.accountNumber || formData.accountNumber.length < 8) return 'Valid Account Number is required.';
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!formData.ifscCode || !ifscRegex.test(formData.ifscCode.toUpperCase())) {
      return 'Valid 11-character IFSC Code (e.g. SBIN0004821) is required.';
    }
    return '';
  };

  const handleNextStep = () => {
    setErrorMsg('');
    let err = '';

    if (currentStep === 1) err = validateStep1();
    else if (currentStep === 2) err = validateStep2();
    else if (currentStep === 3) err = validateStep3();
    else if (currentStep === 4) err = validateStep4();

    if (err) {
      setErrorMsg(err);
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as any);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as any);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.bankAccurateDeclared) {
      setErrorMsg('Please confirm the Bank Details Accuracy Declaration checkbox.');
      return;
    }
    if (!formData.termsAccepted) {
      setErrorMsg('Please accept the Terms & Conditions and Privacy Policy to proceed.');
      return;
    }

    const finalCategory = formData.category === 'Other'
      ? (formData.customCategory.trim() || 'General Retail')
      : formData.category;

    const vendorObject = {
      name: formData.businessName,
      ownerName: formData.ownerName,
      phone: formData.phone,
      email: formData.email,
      storeType: finalCategory,
      fullAddress: `${formData.fullAddress}, ${formData.district}, ${formData.state} ${formData.pincode}`,
      pincode: formData.pincode,
      state: formData.state,
      district: formData.district,
      division: formData.division,
      postOffice: formData.postOffice,
      operatingHours: formData.operatingHours,
      website: formData.website,
      logoUrl: formData.logoUrl,
      businessImages: formData.businessImages,
      alternatePhone: formData.alternatePhone,
      agentCode: formData.agentCode,
      copartnerName: formData.copartnerName,
      panNumber: formData.panNumber.toUpperCase(),
      aadhaarNumber: formData.aadhaarNumber,
      businessLicenseName: formData.businessLicenseName,
      gstStatus: formData.gstStatus,
      businessGst: formData.gstStatus === 'GST Registered' ? formData.gstNumber.toUpperCase() : '',
      msmeStatus: formData.msmeStatus,
      bankDetails: {
        accountHolderName: formData.accountHolderName,
        bankName: formData.bankName,
        branch: formData.branch,
        bankStreetAddress: formData.bankStreetAddress,
        bankCity: formData.bankCity,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode.toUpperCase()
      }
    };

    onSuccess(vendorObject);
    onClose();
  };

  const stepTitles = [
    { num: 1, title: 'Business Info', icon: <Building className="w-4 h-4" /> },
    { num: 2, title: 'Owner Info', icon: <User className="w-4 h-4" /> },
    { num: 3, title: 'Legal & Docs', icon: <FileText className="w-4 h-4" /> },
    { num: 4, title: 'Bank Details', icon: <Landmark className="w-4 h-4" /> },
    { num: 5, title: 'Review', icon: <CheckCircle2 className="w-4 h-4" /> }
  ];

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Onboard New Merchant Vendor" size="xl">
        <div className="space-y-6 text-[#1b1c1c] font-sans">

          {/* Stepper Header Progress Bar */}
          <div className="bg-[#fbf9f8] p-4 rounded-xl border border-[#eae8e7]">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#eae8e7] -translate-y-1/2 z-0" />
              {stepTitles.map((step) => {
                const isActive = currentStep === step.num;
                const isCompleted = currentStep > step.num;
                return (
                  <div
                    key={step.num}
                    onClick={() => {
                      if (step.num < currentStep) setCurrentStep(step.num as any);
                    }}
                    className={`relative z-10 flex flex-col items-center gap-1 cursor-pointer transition ${
                      isActive ? 'scale-105' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition border ${
                        isCompleted
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : isActive
                          ? 'bg-[#864f19] text-white border-[#864f19] shadow-md ring-4 ring-[#ffdcc2]/50'
                          : 'bg-white text-slate-500 border-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : step.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-[#864f19]' : 'text-slate-500'}`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Global Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: BUSINESS INFO */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in text-xs font-semibold">
              <h3 className="font-extrabold text-sm text-[#864f19] uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4" /> Step 1: Business & Store Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Business / Shop Name *"
                  placeholder="e.g. Hosur Supermarket"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
                <Select
                  label="Product or Service Category *"
                  options={[
                    { value: 'Supermarket & Retail', label: 'Supermarket & Retail' },
                    { value: 'Fresh Produce Mart', label: 'Fresh Produce Mart' },
                    { value: 'Bakery & Confectionery', label: 'Bakery & Confectionery' },
                    { value: 'Organic Food Store', label: 'Organic Food Store' },
                    { value: 'Electronics & Appliances', label: 'Electronics & Appliances' },
                    { value: 'Pharmacy & Healthcare', label: 'Pharmacy & Healthcare' },
                    { value: 'Fashion & Clothing', label: 'Fashion & Clothing' },
                    { value: 'Hardware & Building Supplies', label: 'Hardware & Building Supplies' },
                    { value: 'Restaurant & Cafe', label: 'Restaurant & Cafe' },
                    { value: 'Other', label: 'Other (Specify Custom Category)' }
                  ]}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              {formData.category === 'Other' && (
                <Input
                  label="Specify Custom Category *"
                  placeholder="e.g. Boutique, Furniture, Book Store"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                  required
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Business Phone Number (10 Digits) *"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="vendor@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* Business Address & Pincode Lookup */}
              <div className="space-y-3 p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60">
                <p className="text-[10px] uppercase font-black text-[#864f19]">Business Address & Territory</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Postal Code (Pincode) *"
                    placeholder="e.g. 636112"
                    value={formData.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    required
                  />
                  <Select
                    label="Business Operating Hours *"
                    options={[
                      { value: '09:00 AM - 09:00 PM', label: '09:00 AM - 09:00 PM (Standard)' },
                      { value: '08:00 AM - 10:00 PM', label: '08:00 AM - 10:00 PM (Extended)' },
                      { value: '10:00 AM - 08:00 PM', label: '10:00 AM - 08:00 PM' },
                      { value: '07:00 AM - 11:00 PM', label: '07:00 AM - 11:00 PM' },
                      { value: '24/7 Always Open', label: '24/7 Always Open' }
                    ]}
                    value={formData.operatingHours}
                    onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                  />
                </div>

                <Input
                  label="Business Street Address (Door No, Shop No, Building, Street) *"
                  placeholder="e.g. Shop #14, Commercial Plaza, Main Market Road"
                  value={formData.fullAddress}
                  onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                  required
                />

                <Input
                  label="Business Website (Optional)"
                  placeholder="https://www.mybusiness.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />

                {formData.state && (
                  <div className="p-2.5 bg-white border border-[#eae8e7] rounded-lg text-[11px] font-bold text-slate-700 space-y-0.5">
                    <p className="text-[9px] uppercase font-black text-[#864f19]">Auto-Detected Territory</p>
                    <p>State: {formData.state} • District: {formData.district}</p>
                    <p>Division: {formData.division} • Post Office: {formData.postOffice}</p>
                  </div>
                )}
              </div>

              {/* Logo Upload Section (Required) */}
              <div className="p-3 bg-white border border-[#d7c3b5]/60 rounded-xl space-y-2">
                <label className="block text-[10px] font-black uppercase text-[#864f19]">Shop / Brand Logo Upload * (Max 5MB)</label>
                <div className="flex items-center gap-4">
                  {formData.logoUrl ? (
                    <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 group">
                      <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, logoUrl: '', logoFileName: '' })}
                        className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition border-none cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                      <Building className="w-6 h-6" />
                    </div>
                  )}

                  <label className="px-3.5 py-2 bg-[#fbf9f8] hover:bg-[#eae8e7] border border-[#d7c3b5] rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#864f19]" />
                    <span>{formData.logoFileName ? 'Change Logo' : 'Choose Logo Image'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>

              {/* Shop / Business Images Upload (Optional, up to 5) */}
              <div className="p-3 bg-white border border-[#d7c3b5]/60 rounded-xl space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-600">Shop / Business Images (Optional, up to 5 images)</label>
                <div className="flex flex-wrap items-center gap-3">
                  {formData.businessImages.map((img) => (
                    <div key={img.id} className="relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden group shrink-0">
                      <img src={img.url} alt="Shop Image" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeBusinessImage(img.id)}
                        className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition border-none cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {formData.businessImages.length < 5 && (
                    <label className="w-14 h-14 rounded-lg bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#864f19] flex flex-col items-center justify-center text-slate-400 hover:text-[#864f19] cursor-pointer transition">
                      <Plus className="w-4 h-4" />
                      <span className="text-[8px] font-bold">Add Photo</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleBusinessImagesUpload} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OWNER INFO */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in text-xs font-semibold">
              <h3 className="font-extrabold text-sm text-[#864f19] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4" /> Step 2: Owner & Account Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Owner / Contact Person Name *"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                />
                <Input
                  label="Alternate Phone Number (Optional)"
                  placeholder="10-digit secondary contact"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Agent Name / Code (Auto-filled)"
                  value={formData.agentCode}
                  onChange={(e) => setFormData({ ...formData, agentCode: e.target.value })}
                  disabled
                />
                <Input
                  label="Co-partner Name (Optional)"
                  placeholder="e.g. Suresh Kumar"
                  value={formData.copartnerName}
                  onChange={(e) => setFormData({ ...formData, copartnerName: e.target.value })}
                />
              </div>

              {/* Password Section with Toggle & Criteria */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-3">
                <p className="text-[10px] uppercase font-black text-[#864f19]">Account Login Security Password</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 relative">
                    <label className="block text-[10px] font-bold text-[#52443a] uppercase">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create strong password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-white border border-[#d7c3b5]/60 rounded-xl py-2 pl-3 pr-9 text-xs focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="block text-[10px] font-bold text-[#52443a] uppercase">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full bg-white border border-[#d7c3b5]/60 rounded-xl py-2 pl-3 pr-9 text-xs focus:outline-none focus:ring-1 focus:ring-[#864f19]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Criteria Real-time Checklist */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-[11px] font-bold">
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.uppercase ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> At least 1 uppercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.number ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> At least 1 number
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordCriteria.match ? 'text-emerald-700' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENTS & LEGAL */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in text-xs font-semibold">
              <h3 className="font-extrabold text-sm text-[#864f19] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Step 3: Legal Compliance & Identification
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="PAN Number (10 Characters) *"
                  placeholder="e.g. ABCDE1234F"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase().slice(0, 10) })}
                  maxLength={10}
                  required
                />
                <Input
                  label="Aadhaar Number (12 Digits) *"
                  placeholder="12-digit Aadhaar number"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  maxLength={12}
                  inputMode="numeric"
                  required
                />
              </div>

              {/* Business License File Upload */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-2">
                <label className="block text-[10px] font-black uppercase text-[#864f19]">Business License / Trade Document Upload * (PDF/Image)</label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#d7c3b5] rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm">
                    <Upload className="w-4 h-4 text-[#864f19]" />
                    <span>Upload Document File</span>
                    <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleLicenseUpload} />
                  </label>

                  {formData.businessLicenseName && (
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg truncate max-w-xs">
                      📄 {formData.businessLicenseName}
                    </span>
                  )}
                </div>
              </div>

              {/* GST Status & Optional GSTIN */}
              <div className="p-3.5 bg-white rounded-xl border border-[#d7c3b5]/60 space-y-3">
                <label className="block text-[10px] font-black uppercase text-[#864f19]">GST Registration Status *</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="gstStatus"
                      value="Non-GST Declared"
                      checked={formData.gstStatus === 'Non-GST Declared'}
                      onChange={() => setFormData({ ...formData, gstStatus: 'Non-GST Declared', gstNumber: '' })}
                      className="accent-[#864f19]"
                    />
                    <span>Non-GST Declared</span>
                  </label>

                  <label className="flex items-center gap-2 font-bold text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="gstStatus"
                      value="GST Registered"
                      checked={formData.gstStatus === 'GST Registered'}
                      onChange={() => setFormData({ ...formData, gstStatus: 'GST Registered' })}
                      className="accent-[#864f19]"
                    />
                    <span>GST Registered</span>
                  </label>
                </div>

                {formData.gstStatus === 'GST Registered' && (
                  <Input
                    label="GST Number (15 Characters) *"
                    placeholder="e.g. 33AABCK1234F1Z9"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase().slice(0, 15) })}
                    maxLength={15}
                    required
                  />
                )}
              </div>

              {/* MSME Status */}
              <Select
                label="MSME Enterprise Status *"
                options={[
                  { value: 'Non-MSME', label: 'Non-MSME Enterprise' },
                  { value: 'Micro Enterprise', label: 'Micro Enterprise (< ₹1 Cr Turnover)' },
                  { value: 'Small Enterprise', label: 'Small Enterprise (< ₹10 Cr Turnover)' },
                  { value: 'Medium Enterprise', label: 'Medium Enterprise (< ₹50 Cr Turnover)' }
                ]}
                value={formData.msmeStatus}
                onChange={(e) => setFormData({ ...formData, msmeStatus: e.target.value as any })}
              />
            </div>
          )}

          {/* STEP 4: BANK DETAILS */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in text-xs font-semibold">
              <h3 className="font-extrabold text-sm text-[#864f19] uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-4 h-4" /> Step 4: Settlement Bank Account Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Account Holder Name *"
                  placeholder="e.g. Ramesh Kumar / Hosur Supermarket"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  required
                />
                <Select
                  label="Bank Name *"
                  options={[
                    { value: 'State Bank of India', label: 'State Bank of India (SBI)' },
                    { value: 'HDFC Bank', label: 'HDFC Bank' },
                    { value: 'ICICI Bank', label: 'ICICI Bank' },
                    { value: 'Axis Bank', label: 'Axis Bank' },
                    { value: 'Punjab National Bank', label: 'Punjab National Bank' },
                    { value: 'Canara Bank', label: 'Canara Bank' },
                    { value: 'Bank of Baroda', label: 'Bank of Baroda' },
                    { value: 'Kotak Mahindra Bank', label: 'Kotak Mahindra Bank' },
                    { value: 'Union Bank of India', label: 'Union Bank of India' },
                    { value: 'Indian Overseas Bank', label: 'Indian Overseas Bank' }
                  ]}
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Bank Branch Name *"
                  placeholder="e.g. Hosur Main Market Branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  required
                />
                <Input
                  label="Bank City *"
                  placeholder="e.g. Hosur / Salem"
                  value={formData.bankCity}
                  onChange={(e) => setFormData({ ...formData, bankCity: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Bank Street Address *"
                placeholder="e.g. #45 Station Road, Hosur"
                value={formData.bankStreetAddress}
                onChange={(e) => setFormData({ ...formData, bankStreetAddress: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Account Number *"
                  placeholder="Enter bank account number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
                  inputMode="numeric"
                  required
                />
                <Input
                  label="IFSC Code (11 Characters) *"
                  placeholder="e.g. SBIN0004821"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase().slice(0, 11) })}
                  maxLength={11}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & DECLARATION */}
          {currentStep === 5 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4 animate-fade-in text-xs font-semibold">
              <h3 className="font-extrabold text-sm text-[#864f19] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Step 5: Review & Submit Declaration
              </h3>

              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Business Info Summary */}
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Business Info</span>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="font-extrabold text-[#1b1c1c] text-sm">{formData.businessName}</p>
                  <p className="text-slate-600">{formData.category} • {formData.operatingHours}</p>
                  <p className="text-slate-600">📞 {formData.phone} | ✉️ {formData.email}</p>
                  <p className="text-slate-500 text-[11px]">{formData.fullAddress}, {formData.district} {formData.pincode}</p>
                </div>

                {/* Owner Info Summary */}
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Owner Credentials</span>
                    <button type="button" onClick={() => setCurrentStep(2)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="font-extrabold text-[#1b1c1c] text-sm">{formData.ownerName}</p>
                  <p className="text-slate-600">Assigned Agent: {formData.agentCode}</p>
                  {formData.copartnerName && <p className="text-slate-600">Co-partner: {formData.copartnerName}</p>}
                </div>

                {/* Legal & Docs Summary */}
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Legal & Documents</span>
                    <button type="button" onClick={() => setCurrentStep(3)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="text-slate-700">PAN: <strong>{formData.panNumber.toUpperCase()}</strong></p>
                  <p className="text-slate-700">Aadhaar: <strong>{formData.aadhaarNumber}</strong></p>
                  <p className="text-slate-700">GST Status: <strong>{formData.gstStatus}</strong> {formData.gstNumber && `(${formData.gstNumber.toUpperCase()})`}</p>
                  <p className="text-slate-700">MSME: <strong>{formData.msmeStatus}</strong></p>
                </div>

                {/* Bank Details Summary */}
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Bank Account</span>
                    <button type="button" onClick={() => setCurrentStep(4)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="font-extrabold text-[#1b1c1c]">{formData.bankName}</p>
                  <p className="text-slate-600">Holder: {formData.accountHolderName}</p>
                  <p className="text-slate-600">A/C: ••••••{formData.accountNumber.slice(-4)} | IFSC: {formData.ifscCode.toUpperCase()}</p>
                </div>
              </div>

              {/* Declarations Checkboxes */}
              <div className="p-4 bg-[#ffdcc2]/20 border border-[#864f19]/30 rounded-xl space-y-3">
                <label className="flex items-start gap-2.5 font-bold text-xs text-[#52443a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.bankAccurateDeclared}
                    onChange={(e) => setFormData({ ...formData, bankAccurateDeclared: e.target.checked })}
                    className="mt-0.5 accent-[#864f19]"
                    required
                  />
                  <span>
                    Bank Details Accuracy Declaration: I hereby confirm that all bank account numbers, IFSC codes, and account holder details entered are verified and correct for instant payout settlement.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 font-bold text-xs text-[#52443a] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="mt-0.5 accent-[#864f19]"
                    required
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setIsTermsModalOpen(true)}
                      className="text-[#864f19] font-extrabold hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Terms & Conditions and Merchant Privacy Policy
                    </button>
                  </span>
                </label>
              </div>

              {/* Wizard Footer Buttons */}
              <div className="pt-3 flex justify-between items-center border-t border-[#eae8e7]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  leftIcon={<ChevronLeft className="w-4 h-4" />}
                >
                  Previous Step
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl border-none shadow-md cursor-pointer"
                >
                  Submit Onboarding
                </Button>
              </div>
            </form>
          )}

          {/* Stepper Navigation Controls for Steps 1-4 */}
          {currentStep < 5 && (
            <div className="pt-4 flex justify-between items-center border-t border-[#eae8e7]">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous Step
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleNextStep}
                rightIcon={<ChevronRight className="w-4 h-4" />}
                className="bg-[#864f19] hover:bg-[#a3672f] text-white font-bold py-2 px-5 rounded-xl border-none shadow-sm cursor-pointer"
              >
                Next Step
              </Button>
            </div>
          )}

        </div>
      </Modal>

      {/* TERMS & CONDITIONS POPUP MODAL */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title="Merchant Onboarding Terms & Privacy Policy"
        size="lg"
      >
        <div className="space-y-4 text-xs font-semibold text-slate-700 max-h-[60vh] overflow-y-auto pr-2">
          <p className="font-bold text-slate-900 text-sm">1. Verification & KYC Agreement</p>
          <p>
            By onboarding as a merchant partner on the Connect Portal platform, you certify that all business information, PAN, Aadhaar, and trade licenses uploaded are authentic and legally compliant.
          </p>

          <p className="font-bold text-slate-900 text-sm">2. Settlement & Bank Payouts</p>
          <p>
            Payouts, earnings, and instant cashout settlements will be credited exclusively to the bank account number and IFSC code provided in Step 4. Connect Agent portal is not liable for incorrect details entered by the agent.
          </p>

          <p className="font-bold text-slate-900 text-sm">3. Data Privacy & Confidentiality</p>
          <p>
            Merchant customer details, order history, and store information will be securely stored under encrypted database standards and will not be shared with unauthorized third parties.
          </p>
        </div>
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button variant="primary" onClick={() => setIsTermsModalOpen(false)} className="bg-[#864f19] text-white">
            I Understand & Agree
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default OnboardVendorWizardModal;
