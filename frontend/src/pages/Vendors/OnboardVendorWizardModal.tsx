import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, Select } from '../../components/ui';
import {
  Building, User, FileText, Landmark, CheckCircle2, ChevronRight, ChevronLeft,
  Upload, Eye, EyeOff, X, AlertCircle, ShieldCheck, Check, Info, FileCode, Plus, Lock, MapPin
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getLocationFromPincode,
  getDistrictsForState,
  getDivisionsForDistrict,
  getPincodesForDivision,
  validateTerritoryBelongsToAgent
} from '../../utils/locationData';
import { fetchAdminCategories, getActiveMainCategories, CANONICAL_MAIN_CATEGORIES } from '../../services/categoryService';

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

  // Main Categories from Admin Category Management
  const [mainCategories, setMainCategories] = useState<string[]>(CANONICAL_MAIN_CATEGORIES);

  useEffect(() => {
    let isMounted = true;
    fetchAdminCategories().then(dbCategories => {
      if (isMounted) {
        const activeMains = getActiveMainCategories(dbCategories);
        if (activeMains && activeMains.length > 0) {
          setMainCategories(activeMains);
        }
      }
    }).catch(err => {
      console.warn('Failed to fetch categories from Admin Category Management:', err);
    });
    return () => { isMounted = false; };
  }, []);

  // Show/hide password states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Determine logged-in Agent role and approved territory
  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const activeRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toLowerCase();

  const agentTerritory = user?.assignedTerritory || user?.territory || {
    state: (user as any)?.assignedState,
    district: (user as any)?.assignedDistrict,
    division: (user as any)?.assignedDivision,
    pincode: (user as any)?.assignedPincode
  };

  const agentState = (agentTerritory?.state || (user as any)?.assignedState || '').trim();
  const agentDistrict = (agentTerritory?.district || (user as any)?.assignedDistrict || '').trim();
  const agentDivision = (agentTerritory?.division || (user as any)?.assignedDivision || '').trim();
  const agentPincode = (agentTerritory?.pincode || (user as any)?.assignedPincode || '').trim();
  const agentPostOffice = ((agentTerritory as any)?.postOffice || (user as any)?.postOffice || '').trim();
  const agentTaluk = ((agentTerritory as any)?.taluk || (user as any)?.taluk || '').trim();

  // Step 1: Business Info
  const [formData, setFormData] = useState({
    // Step 1
    businessName: '',
    category: 'Services',
    customCategory: '',
    phone: '',
    email: '',
    buildingNo: '',
    streetName: '',
    postOffice: agentPostOffice,
    taluk: agentTaluk,
    district: agentDistrict,
    state: agentState,
    pincode: agentPincode,
    division: agentDivision,
    operatingHours: '09:00 AM - 09:00 PM',
    website: '',
    logoUrl: '',
    logoFileName: '',
    businessImages: [] as { id: string; url: string; name: string }[],

    // Step 2
    ownerName: '',
    alternatePhone: '',
    agentCode: user?.name ? `${user.name} (${user.registrationId || 'AGENT-REF'})` : 'Self Registered',
    password: '',
    confirmPassword: '',

    // Step 3
    panNumber: '',
    aadhaarNumber: '',
    fssaiNumber: '',
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

  // Dynamic available options strictly derived from agent jurisdiction
  const availableDistricts = useMemo(() => {
    if (activeRole === 'state') {
      return getDistrictsForState(formData.state || agentState);
    }
    return (formData.district || agentDistrict) ? [formData.district || agentDistrict] : [];
  }, [activeRole, formData.state, agentState, formData.district, agentDistrict]);

  const availableDivisions = useMemo(() => {
    if (activeRole === 'state' || activeRole === 'district') {
      return getDivisionsForDistrict(formData.district || agentDistrict, formData.state || agentState);
    }
    return (formData.division || agentDivision) ? [formData.division || agentDivision] : [];
  }, [activeRole, formData.district, agentDistrict, formData.state, agentState, formData.division, agentDivision]);

  const availablePincodes = useMemo(() => {
    if (activeRole === 'pincode') {
      return agentPincode ? [agentPincode] : [];
    }
    const currentDiv = formData.division || agentDivision;
    if (!currentDiv) return [];
    return getPincodesForDivision(currentDiv);
  }, [activeRole, formData.division, agentDivision, agentPincode]);

  // Synchronize form territory with logged in agent when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      const defaultState = agentState;
      let defaultDistrict = agentDistrict;
      let defaultDivision = agentDivision;
      let defaultPin = agentPincode;

      if (activeRole === 'state') {
        const districts = getDistrictsForState(defaultState);
        defaultDistrict = agentDistrict && districts.includes(agentDistrict) ? agentDistrict : (districts[0] || '');
        const divisions = defaultDistrict ? getDivisionsForDistrict(defaultDistrict, defaultState) : [];
        defaultDivision = agentDivision && divisions.includes(agentDivision) ? agentDivision : (divisions[0] || '');
        const pins = defaultDivision ? getPincodesForDivision(defaultDivision) : [];
        defaultPin = pins[0] || '';
      } else if (activeRole === 'district') {
        defaultDistrict = agentDistrict;
        const divisions = defaultDistrict ? getDivisionsForDistrict(defaultDistrict, defaultState) : [];
        defaultDivision = agentDivision && divisions.includes(agentDivision) ? agentDivision : (divisions[0] || '');
        const pins = defaultDivision ? getPincodesForDivision(defaultDivision) : [];
        defaultPin = pins[0] || '';
      } else if (activeRole === 'division') {
        defaultDistrict = agentDistrict;
        defaultDivision = agentDivision;
        const pins = defaultDivision ? getPincodesForDivision(defaultDivision) : [];
        defaultPin = agentPincode && pins.includes(agentPincode) ? agentPincode : (pins[0] || '');
      } else {
        // Pincode Agent: strictly locked to agent territory
        defaultDistrict = agentDistrict;
        defaultDivision = agentDivision;
        defaultPin = agentPincode;
      }

      const loc = defaultPin ? getLocationFromPincode(defaultPin, {
        state: defaultState,
        district: defaultDistrict,
        division: defaultDivision,
        taluk: agentTaluk,
        postOffice: agentPostOffice
      }) : { taluk: agentTaluk || '', postOffice: agentPostOffice || '' };

      setFormData(prev => ({
        ...prev,
        state: defaultState,
        district: defaultDistrict,
        division: defaultDivision,
        pincode: defaultPin,
        taluk: loc.taluk || agentTaluk || (defaultDivision ? defaultDivision.replace(' Division', '') : ''),
        postOffice: loc.postOffice || agentPostOffice || '',
        agentCode: user?.name ? `${user.name} (${user.registrationId || 'AGENT-REF'})` : 'Self Registered'
      }));
    }
  }, [isOpen, user, activeRole, agentState, agentDistrict, agentDivision, agentPincode, agentPostOffice, agentTaluk]);

  // Handle District selection (State Agent only)
  const handleDistrictSelect = (newDistrict: string) => {
    const divs = getDivisionsForDistrict(newDistrict, formData.state);
    const defaultDiv = divs[0] || '';
    const pins = defaultDiv ? getPincodesForDivision(defaultDiv) : [];
    const defaultPin = pins[0] || '';
    const loc = defaultPin ? getLocationFromPincode(defaultPin, {
      state: formData.state,
      district: newDistrict,
      division: defaultDiv
    }) : { taluk: '', postOffice: '' };

    setFormData(prev => ({
      ...prev,
      district: newDistrict,
      division: defaultDiv,
      taluk: loc.taluk || (defaultDiv ? defaultDiv.replace(' Division', '') : ''),
      pincode: defaultPin,
      postOffice: loc.postOffice || ''
    }));
  };

  // Handle Division selection (State & District Agents)
  const handleDivisionSelect = (newDiv: string) => {
    const pins = newDiv ? getPincodesForDivision(newDiv) : [];
    const defaultPin = pins[0] || '';
    const loc = defaultPin ? getLocationFromPincode(defaultPin, {
      state: formData.state,
      district: formData.district,
      division: newDiv
    }) : { taluk: '', postOffice: '' };

    setFormData(prev => ({
      ...prev,
      division: newDiv,
      taluk: loc.taluk || (newDiv ? newDiv.replace(' Division', '') : ''),
      pincode: defaultPin,
      postOffice: loc.postOffice || ''
    }));
  };

  // Handle Pincode selection (Division, District, State Agents)
  const handlePincodeSelect = (newPin: string) => {
    const loc = getLocationFromPincode(newPin, {
      state: formData.state,
      district: formData.district,
      division: formData.division
    });

    setFormData(prev => ({
      ...prev,
      pincode: newPin,
      postOffice: loc.postOffice,
      taluk: loc.taluk || formData.division.replace(' Division', ''),
      district: loc.district || formData.district,
      state: loc.state || formData.state,
      division: loc.division || formData.division
    }));
  };

  // Phone Number formatting & numeric-only input (starts with 6, 7, 8, 9)
  const handlePhoneInput = (val: string, field: 'phone' | 'alternatePhone') => {
    const digits = val.replace(/\D/g, '');
    if (digits.length > 0 && !/^[6-9]/.test(digits)) {
      // Reject invalid starting digit immediately
      return;
    }
    setFormData(prev => ({ ...prev, [field]: digits.slice(0, 10) }));
  };

  // Email formatting & whitespace removal
  const handleEmailInput = (val: string) => {
    setFormData(prev => ({ ...prev, email: val.replace(/\s+/g, '').toLowerCase() }));
  };

  // Aadhaar input (digits only, max 12)
  const handleAadhaarInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    setFormData(prev => ({ ...prev, aadhaarNumber: digits }));
  };

  // PAN input (uppercase alphanumeric, max 10)
  const handlePanInput = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, panNumber: clean }));
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
  const validateStep1 = (): string => {
    if (!formData.businessName.trim()) return 'Business / Shop Name is required.';
    
    // Mobile validation: exactly 10 digits, starts with 6, 7, 8, 9
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return 'Business Phone Number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }

    // Email validation: standard email format, no spaces
    const cleanEmail = formData.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || cleanEmail.includes(' ') || !emailRegex.test(cleanEmail)) {
      return 'Valid Email Address is required (e.g. name@example.com). Spaces and invalid formats are not allowed.';
    }
    
    // Mandatory Address Fields
    if (!formData.buildingNo.trim()) return 'Building No / Door No / Shop No is required.';
    if (!formData.streetName.trim()) return 'Street Name / Area is required.';
    if (!formData.district.trim()) return 'District is required.';
    if (!formData.state.trim()) return 'State is required.';
    if (!formData.division.trim()) return 'Division is required.';
    if (!formData.pincode || formData.pincode.replace(/\D/g, '').length !== 6) {
      return 'Valid 6-digit Postal Code (Pincode) is required.';
    }
    if (availablePincodes.length === 0 || !availablePincodes.includes(formData.pincode)) {
      return 'No valid pincode is configured in Admin Pincode Management for this division.';
    }
    if (!formData.postOffice.trim()) return 'Post Office is required.';
    if (!formData.taluk.trim()) return 'Taluk / Sub-District is required.';

    // Territory Jurisdiction Check against Logged-in Agent's Approved Territory
    const territoryCheck = validateTerritoryBelongsToAgent(activeRole, agentTerritory, formData);
    if (!territoryCheck.valid) {
      return territoryCheck.reason || 'Selected territory is outside your approved jurisdiction.';
    }

    if (!formData.logoUrl) return 'Shop / Brand Logo is required. Please upload your shop logo image.';
    return '';
  };

  const validateStep2 = (): string => {
    if (!formData.ownerName.trim()) return 'Owner / Contact Person Name is required.';
    
    // Owner Phone: exactly 10 digits, starts with 6, 7, 8, 9
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      return 'Owner Phone Number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }

    // Alternate Phone (optional, but if provided must be 10 digits starting with 6-9)
    if (formData.alternatePhone) {
      const altClean = formData.alternatePhone.replace(/\D/g, '');
      if (altClean.length !== 10 || !/^[6-9]\d{9}$/.test(altClean)) {
        return 'Alternate Phone Number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      }
    }

    if (!formData.password) return 'Account Password is required.';
    if (!passwordCriteria.length || !passwordCriteria.uppercase || !passwordCriteria.number) {
      return 'Password does not meet required criteria (min 8 chars, 1 uppercase, 1 number).';
    }
    if (!passwordCriteria.match) return 'Passwords do not match.';
    return '';
  };

  const validateStep3 = (): string => {
    // PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const cleanPan = formData.panNumber.trim().toUpperCase();
    if (!cleanPan || !panRegex.test(cleanPan)) {
      return 'Valid 10-character PAN Number (e.g. ABCDE1234F - 5 uppercase letters, 4 digits, 1 uppercase letter) is required.';
    }

    // Aadhaar: exactly 12 numeric digits
    const aadhaarClean = formData.aadhaarNumber.replace(/\D/g, '');
    if (!aadhaarClean || aadhaarClean.length !== 12 || !/^\d{12}$/.test(aadhaarClean)) {
      return 'Valid 12-digit Aadhaar Number is required (numeric only, no spaces or special characters).';
    }

    const isFood = ['Food', 'Daily Needs', 'Supermarket & Retail', 'Fresh Produce Mart', 'Bakery & Confectionery', 'Organic Food Store', 'Restaurant & Cafe'].includes(formData.category);

    if (isFood) {
      const fssaiClean = formData.fssaiNumber ? formData.fssaiNumber.replace(/\D/g, '') : '';
      if (!fssaiClean || fssaiClean.length !== 14) {
        return 'Valid 14-digit FSSAI License / Registration Number is required for Food & Retail merchants.';
      }
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

  const validateStep4 = (): string => {
    if (!formData.accountHolderName.trim()) return 'Account Holder Name is required.';
    if (!formData.branch.trim()) return 'Bank Branch Name is required.';
    if (!formData.bankCity.trim()) return 'Bank City is required.';
    if (!formData.accountNumber || formData.accountNumber.length < 8 || formData.accountNumber.length > 18) {
      return 'Valid 8 to 18-digit Bank Account Number is required.';
    }
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

    // Pre-submission validation across all sections without clearing form data
    const err1 = validateStep1();
    if (err1) { setErrorMsg(err1); setCurrentStep(1); return; }

    const err2 = validateStep2();
    if (err2) { setErrorMsg(err2); setCurrentStep(2); return; }

    const err3 = validateStep3();
    if (err3) { setErrorMsg(err3); setCurrentStep(3); return; }

    const err4 = validateStep4();
    if (err4) { setErrorMsg(err4); setCurrentStep(4); return; }

    if (!formData.bankAccurateDeclared) {
      setErrorMsg('Please confirm the Bank Details Accuracy Declaration checkbox.');
      return;
    }
    if (!formData.termsAccepted) {
      setErrorMsg('Please accept the Terms & Conditions and Privacy Policy to proceed.');
      return;
    }

    const cleanAadhaar = formData.aadhaarNumber.replace(/\D/g, '');
    const cleanPan = formData.panNumber.trim().toUpperCase();
    const cleanPhone = formData.phone.replace(/\D/g, '');
    const cleanEmail = formData.email.trim().toLowerCase();

    // Construct full geographical address
    const constructedAddress = `${formData.buildingNo.trim()}, ${formData.streetName.trim()}, ${formData.postOffice.trim()}, ${formData.taluk.trim()}, ${formData.district.trim()}, ${formData.state.trim()} - ${formData.pincode.trim()}`;

    const vendorObject = {
      name: formData.businessName.trim(),
      businessName: formData.businessName.trim(),
      ownerName: formData.ownerName.trim(),
      contactPerson: formData.ownerName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      storeType: formData.category,
      category: formData.category,
      buildingNo: formData.buildingNo.trim(),
      streetName: formData.streetName.trim(),
      postOffice: formData.postOffice.trim(),
      taluk: formData.taluk.trim(),
      district: formData.district.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      fullAddress: constructedAddress,
      division: formData.division.trim(),
      operatingHours: formData.operatingHours,
      website: formData.website.trim(),
      logoUrl: formData.logoUrl,
      businessImages: formData.businessImages,
      alternatePhone: formData.alternatePhone.replace(/\D/g, ''),
      agentCode: formData.agentCode,
      fssaiNumber: formData.fssaiNumber ? formData.fssaiNumber.replace(/\D/g, '') : '',
      panNumber: cleanPan,
      pan: cleanPan,
      aadhaarNumber: cleanAadhaar,
      aadhaar: cleanAadhaar,
      businessLicenseName: formData.businessLicenseName,
      gstStatus: formData.gstStatus,
      businessGst: formData.gstStatus === 'GST Registered' ? formData.gstNumber.toUpperCase().trim() : '',
      msmeStatus: formData.msmeStatus,
      bankDetails: {
        accountHolderName: formData.accountHolderName.trim(),
        bankName: formData.bankName,
        branch: formData.branch.trim(),
        bankStreetAddress: formData.bankStreetAddress.trim(),
        bankCity: formData.bankCity.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.toUpperCase().trim()
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
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#864f19] uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4" /> Step 1: Business & Store Information
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-[#ffdcc2] text-[#864f19] border border-[#864f19]/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {activeRole === 'pincode' ? `Pincode Agent: PIN ${agentPincode} (Locked)` :
                   activeRole === 'division' ? `Division Agent: ${agentDivision} (Locked)` :
                   activeRole === 'district' ? `District Agent: ${agentDistrict} (Locked)` :
                   `State Agent: ${agentState} (Locked)`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Business / Shop Name *"
                  placeholder="e.g. Harur Supermarket"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                />
                <Select
                  label="Product or Service Category *"
                  options={mainCategories.map(cat => ({ value: cat, label: cat }))}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Business Phone Number (10 Digits, 6-9 Start) *"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => handlePhoneInput(e.target.value, 'phone')}
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
                <Input
                  label="Email Address *"
                  type="email"
                  placeholder="vendor@example.com"
                  value={formData.email}
                  onChange={(e) => handleEmailInput(e.target.value)}
                  required
                />
              </div>

              {/* Business Address & Territory Controlled by Logged-in Agent Jurisdiction */}
              <div className="space-y-3 p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase font-black text-[#864f19] flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" /> Business Address & Territory (All Fields Mandatory)
                  </p>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">
                    Admin Approved Territory
                  </span>
                </div>

                {/* Building / Door / Shop No & Street Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Building No / Door No / Shop No *"
                    placeholder="e.g. Door #14-2, Shop #5, Commercial Complex"
                    value={formData.buildingNo}
                    onChange={(e) => setFormData({ ...formData, buildingNo: e.target.value })}
                    required
                  />
                  <Input
                    label="Street Name / Area *"
                    placeholder="e.g. Main Market Road, Bus Stand Area"
                    value={formData.streetName}
                    onChange={(e) => setFormData({ ...formData, streetName: e.target.value })}
                    required
                  />
                </div>

                {/* State & District */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase">
                      State (Locked to Agent Jurisdiction) *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      disabled
                      readOnly
                      className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                    />
                  </div>

                  {activeRole === 'state' ? (
                    <Select
                      label="District (Select within Assigned State) *"
                      options={availableDistricts.map(d => ({ value: d, label: d }))}
                      value={formData.district}
                      onChange={(e) => handleDistrictSelect(e.target.value)}
                    />
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">
                        District (Locked to Approved Jurisdiction) *
                      </label>
                      <input
                        type="text"
                        value={formData.district}
                        disabled
                        readOnly
                        className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                      />
                    </div>
                  )}
                </div>

                {/* Division & Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRole === 'state' || activeRole === 'district' ? (
                    <Select
                      label="Division / Sub-District Territory *"
                      options={availableDivisions.map(div => ({ value: div, label: div }))}
                      value={formData.division}
                      onChange={(e) => handleDivisionSelect(e.target.value)}
                    />
                  ) : (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">
                        Division (Locked to Assigned Division) *
                      </label>
                      <input
                        type="text"
                        value={formData.division}
                        disabled
                        readOnly
                        className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                      />
                    </div>
                  )}

                  {activeRole === 'pincode' ? (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase flex items-center justify-between">
                        <span>Postal Code (Pincode) *</span>
                        <span className="text-[9px] text-[#864f19] font-black">LOCKED</span>
                      </label>
                      <input
                        type="text"
                        value={formData.pincode || 'No Pincode Assigned'}
                        disabled
                        readOnly
                        className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-[#864f19] cursor-not-allowed select-none"
                      />
                    </div>
                  ) : availablePincodes.length === 0 ? (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase flex items-center justify-between">
                        <span>Postal Code (Pincode) *</span>
                        <span className="text-[9px] text-amber-600 font-bold">UNAVAILABLE</span>
                      </label>
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>No pincode available in this division.</span>
                      </div>
                    </div>
                  ) : (
                    <Select
                      label={`Postal Code (Pincodes in ${formData.division || 'Division'}) *`}
                      options={availablePincodes.map(p => {
                        const loc = getLocationFromPincode(p);
                        return {
                          value: p,
                          label: loc.postOffice ? `${p} — ${loc.postOffice}` : p
                        };
                      })}
                      value={formData.pincode}
                      onChange={(e) => handlePincodeSelect(e.target.value)}
                    />
                  )}
                </div>

                {/* Post Office & Taluk (Automatically populated from Selected Pincode) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase flex items-center justify-between">
                      <span>Post Office (Auto-Populated from Pincode) *</span>
                      <span className="text-[9px] text-emerald-700 font-bold">MATCHED</span>
                    </label>
                    <input
                      type="text"
                      value={formData.postOffice}
                      disabled
                      readOnly
                      className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase flex items-center justify-between">
                      <span>Taluk / Administrative Area *</span>
                      <span className="text-[9px] text-emerald-700 font-bold">MATCHED</span>
                    </label>
                    <input
                      type="text"
                      value={formData.taluk}
                      disabled
                      readOnly
                      className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-not-allowed select-none"
                    />
                  </div>
                </div>

                {/* Operating Hours & Website */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <Input
                    label="Business Website (Optional)"
                    placeholder="https://www.mybusiness.com"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
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
                  label="Owner Phone Number (10 Digits, 6-9 Start) *"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => handlePhoneInput(e.target.value, 'phone')}
                  maxLength={10}
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Alternate Phone Number (Optional, 10 Digits)"
                  placeholder="10-digit secondary contact"
                  value={formData.alternatePhone}
                  onChange={(e) => handlePhoneInput(e.target.value, 'alternatePhone')}
                  maxLength={10}
                  inputMode="numeric"
                />
                <Input
                  label="Registered By Agent (Read-Only)"
                  value={formData.agentCode}
                  disabled
                />
              </div>

              {/* Account Password Creation */}
              <div className="p-3.5 bg-[#fbf9f8] rounded-xl border border-[#d7c3b5]/60 space-y-3">
                <p className="text-[10px] uppercase font-black text-[#864f19]">Vendor App Access Password</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Create Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
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

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-700 uppercase mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
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
                  label="PAN Number (10 Characters: 5 Letters, 4 Digits, 1 Letter) *"
                  placeholder="e.g. ABCDE1234F"
                  value={formData.panNumber}
                  onChange={(e) => handlePanInput(e.target.value)}
                  maxLength={10}
                  required
                />
                <Input
                  label="Aadhaar Number (Exactly 12 Digits) *"
                  placeholder="12-digit Aadhaar number"
                  value={formData.aadhaarNumber}
                  onChange={(e) => handleAadhaarInput(e.target.value)}
                  maxLength={12}
                  inputMode="numeric"
                  required
                />
              </div>

              {/* FSSAI License / Registration Number */}
              <div>
                <Input
                  label={`FSSAI License / Registration Number (14 Digits) ${['Food', 'Daily Needs', 'Supermarket & Retail', 'Fresh Produce Mart', 'Bakery & Confectionery', 'Organic Food Store', 'Restaurant & Cafe'].includes(formData.category) ? '*' : '(Optional)'}`}
                  placeholder="e.g. 10019043002761 (14-digit registration number)"
                  value={formData.fssaiNumber}
                  onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                  maxLength={14}
                  inputMode="numeric"
                  required={['Food', 'Daily Needs', 'Supermarket & Retail', 'Fresh Produce Mart', 'Bakery & Confectionery', 'Organic Food Store', 'Restaurant & Cafe'].includes(formData.category)}
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
                  label="Account Number (8 to 18 Digits) *"
                  placeholder="Enter 8-18 digit bank account number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 18) })}
                  maxLength={18}
                  inputMode="numeric"
                  required
                />
                <Input
                  label="IFSC Code (11 Characters) *"
                  placeholder="e.g. SBIN0004821"
                  value={formData.ifscCode}
                  onChange={(e) => {
                    const ifsc = e.target.value.toUpperCase().slice(0, 11);
                    let bankName = formData.bankName;
                    let branch = formData.branch;
                    let bankCity = formData.bankCity;

                    if (ifsc.length >= 4) {
                      const prefix = ifsc.slice(0, 4);
                      if (prefix === 'SBIN') { bankName = 'State Bank of India'; }
                      else if (prefix === 'HDFC') { bankName = 'HDFC Bank'; }
                      else if (prefix === 'ICIC') { bankName = 'ICICI Bank'; }
                      else if (prefix === 'UTIB' || prefix === 'AXIS') { bankName = 'Axis Bank'; }
                      else if (prefix === 'CNRB') { bankName = 'Canara Bank'; }
                    }

                    setFormData({
                      ...formData,
                      ifscCode: ifsc,
                      bankName,
                      branch,
                      bankCity
                    });
                  }}
                  maxLength={11}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Bank Name *"
                  isSearchable={true}
                  placeholder="Select or search bank..."
                  options={[
                    { value: 'State Bank of India', label: 'State Bank of India (SBI)' },
                    { value: 'HDFC Bank', label: 'HDFC Bank' },
                    { value: 'ICICI Bank', label: 'ICICI Bank' },
                    { value: 'Axis Bank', label: 'Axis Bank' },
                    { value: 'Canara Bank', label: 'Canara Bank' },
                    { value: 'Bank of Baroda', label: 'Bank of Baroda' },
                    { value: 'Punjab National Bank', label: 'Punjab National Bank' },
                    { value: 'Kotak Mahindra Bank', label: 'Kotak Mahindra Bank' },
                    { value: 'Indian Bank', label: 'Indian Bank' },
                    { value: 'Indian Overseas Bank', label: 'Indian Overseas Bank' },
                    { value: 'Union Bank of India', label: 'Union Bank of India' },
                    { value: 'IDFC FIRST Bank', label: 'IDFC FIRST Bank' },
                    { value: 'Karur Vysya Bank', label: 'Karur Vysya Bank' },
                    { value: 'Tamilnad Mercantile Bank', label: 'Tamilnad Mercantile Bank' }
                  ]}
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
                <Input
                  label="Account Holder Name *"
                  placeholder="e.g. Ramesh Kumar / Business Name"
                  value={formData.accountHolderName}
                  onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Bank Branch Name *"
                  placeholder="e.g. Main Branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  required
                />
                <Input
                  label="Bank City *"
                  placeholder="e.g. City / Town"
                  value={formData.bankCity}
                  onChange={(e) => setFormData({ ...formData, bankCity: e.target.value })}
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
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Business & Territory</span>
                    <button type="button" onClick={() => setCurrentStep(1)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="font-extrabold text-[#1b1c1c] text-sm">{formData.businessName}</p>
                  <p className="text-slate-600">{formData.category} • {formData.operatingHours}</p>
                  <p className="text-slate-600">📞 +91 {formData.phone} | ✉️ {formData.email}</p>
                  <div className="text-slate-600 text-[11px] space-y-0.5 mt-1 bg-white p-2 rounded-lg border border-[#eae8e7]">
                    <p><strong className="text-slate-800">Business Address:</strong> {formData.buildingNo}, {formData.streetName}</p>
                    <p><strong className="text-slate-800">Post Office:</strong> {formData.postOffice}</p>
                    <p><strong className="text-slate-800">Taluk:</strong> {formData.taluk} | <strong className="text-slate-800">Division:</strong> {formData.division}</p>
                    <p><strong className="text-slate-800">District:</strong> {formData.district} | <strong className="text-slate-800">State:</strong> {formData.state}</p>
                    <p><strong className="text-slate-800">Postal Code (PIN):</strong> <span className="font-black text-[#864f19]">{formData.pincode}</span></p>
                  </div>
                </div>

                {/* Owner Info Summary */}
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Owner Credentials</span>
                    <button type="button" onClick={() => setCurrentStep(2)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="font-extrabold text-[#1b1c1c] text-sm">{formData.ownerName}</p>
                  <p className="text-slate-600">Primary Mobile: <strong>+91 {formData.phone}</strong></p>
                  {formData.alternatePhone && <p className="text-slate-600">Alternate: +91 {formData.alternatePhone}</p>}
                  <p className="text-slate-600">Registered By Agent: <strong>{formData.agentCode}</strong></p>
                  <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Jurisdiction Level: {activeRole.toUpperCase()} AGENT</p>
                </div>

                {/* Legal & Docs Summary */}
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Legal & Identification</span>
                    <button type="button" onClick={() => setCurrentStep(3)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="text-slate-700">PAN Card: <strong>{formData.panNumber.toUpperCase()}</strong></p>
                  <p className="text-slate-700">Aadhaar: <strong>•••• •••• {formData.aadhaarNumber.slice(-4)}</strong></p>
                  {formData.fssaiNumber && <p className="text-slate-700">FSSAI License: <strong>{formData.fssaiNumber}</strong></p>}
                  <p className="text-slate-700">GST Status: <strong>{formData.gstStatus}</strong> {formData.gstNumber && `(${formData.gstNumber.toUpperCase()})`}</p>
                  <p className="text-slate-700">Trade Document: <strong>{formData.businessLicenseName}</strong></p>
                </div>

                {/* Bank Details Summary */}
                <div className="p-3 bg-[#fbf9f8] rounded-xl border border-[#eae8e7] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-[#864f19]">Bank Account</span>
                    <button type="button" onClick={() => setCurrentStep(4)} className="text-[10px] font-bold text-blue-700 hover:underline bg-transparent border-none cursor-pointer">Edit</button>
                  </div>
                  <p className="font-extrabold text-[#1b1c1c]">{formData.bankName}</p>
                  <p className="text-slate-600">Account Holder: {formData.accountHolderName}</p>
                  <p className="text-slate-600">A/C: ••••••{formData.accountNumber.slice(-4)} | IFSC: {formData.ifscCode.toUpperCase()}</p>
                  <p className="text-slate-500 text-[11px]">{formData.branch}, {formData.bankCity}</p>
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
