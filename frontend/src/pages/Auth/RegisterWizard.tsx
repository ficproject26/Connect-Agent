import {
  getActiveStateList,
  getActiveDistrictList,
  getActiveDivisionList,
  getActivePincodes,
  TerritoryItem,
  TerritoryPincode
} from '../../utils/territoryService';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  ArrowLeft, ArrowRight, Save, Shield, FileText, CheckCircle, Eye, EyeOff,
  RotateCcw, Trash2, MapPin, Building2, Lock, AlertTriangle, RefreshCw
} from 'lucide-react';
import { AgentNetworkHero } from '../../components/auth/AgentNetworkHero';
import connectPortalLogo from '../../assets/connect_portal_logo.png';

const REGISTRATION_DRAFT_KEY = 'agent_registration_draft';

export const RegisterWizard: React.FC = () => {
  // Real database territory state
  const [adminStates, setAdminStates] = useState<TerritoryItem[]>([]);
  const [adminDistricts, setAdminDistricts] = useState<TerritoryItem[]>([]);
  const [adminDivisions, setAdminDivisions] = useState<TerritoryItem[]>([]);
  const [adminPincodes, setAdminPincodes] = useState<TerritoryPincode[]>([]);

  // Territory loading & error states
  const [isLoadingStates, setIsLoadingStates] = useState<boolean>(true);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState<boolean>(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState<boolean>(false);
  const [isLoadingPincodes, setIsLoadingPincodes] = useState<boolean>(false);
  const [territoryError, setTerritoryError] = useState<string>('');

  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  // Check if an existing agent was passed for editing
  const editingAgent = useMemo(() => {
    return (location.state as any)?.agent || (location.state as any)?.existingAgent || null;
  }, [location.state]);

  // Wizard state control
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;
  const [formErrors, setFormErrors] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxDobDate = useMemo(() => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  }, []);

  // Form Fields State
  const [role, setRole] = useState<'state' | 'division' | 'district' | 'pincode'>('state');
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'male',
    aadhaarNumber: '',
    panNumber: ''
  });

  // 1. Dedicated Assigned Territory State (Dynamic from Central Database)
  const [assignedTerritory, setAssignedTerritory] = useState({
    state: '',
    stateId: '',
    district: '',
    districtId: '',
    division: '',
    divisionId: '',
    taluk: '',
    talukId: '',
    pincode: '',
    pincodeId: ''
  });

  // 2. Dedicated Address Details State (Physical / Contact Address)
  const [address, setAddress] = useState({
    buildingNo: '',
    street: '',
    locality: '',
    postOffice: '',
    taluk: '',
    state: '',
    district: '',
    pincode: ''
  });

  // Dynamic Territory Loading from Central Territory Database (Admin Pincode Management)
  const loadAdminStates = useCallback(async (forceRefresh = false) => {
    setIsLoadingStates(true);
    setTerritoryError('');
    try {
      const states = await getActiveStateList(forceRefresh);
      setAdminStates(states);

      setAssignedTerritory(prev => {
        // If existing state selected or provided by editingAgent, resolve its stateId
        if (prev.state) {
          const matched = states.find(s =>
            s.name.trim().toLowerCase() === prev.state.trim().toLowerCase() ||
            (prev.stateId && s.id === prev.stateId)
          );
          if (matched) {
            return { ...prev, state: matched.name, stateId: matched.id };
          }
        }
        return prev;
      });
    } catch (err: any) {
      console.error('Failed to load active states from central territory DB:', err);
      setTerritoryError('Unable to load territories. Please try again.');
    } finally {
      setIsLoadingStates(false);
    }
  }, []);

  useEffect(() => {
    loadAdminStates(false);
  }, [loadAdminStates]);

  // Load districts dynamically when assigned state changes
  useEffect(() => {
    if (!assignedTerritory.state) {
      setAdminDistricts([]);
      return;
    }
    let isMounted = true;
    setIsLoadingDistricts(true);
    getActiveDistrictList(assignedTerritory.stateId || assignedTerritory.state)
      .then(districts => {
        if (isMounted) {
          setAdminDistricts(districts);
          setAssignedTerritory(prev => {
            if (prev.district && !prev.districtId) {
              const matched = districts.find(d => d.name.trim().toLowerCase() === prev.district.trim().toLowerCase());
              if (matched) {
                return { ...prev, districtId: matched.id };
              }
            }
            return prev;
          });
        }
      })
      .catch(err => {
        console.error('Failed to load active districts:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDistricts(false);
      });
    return () => { isMounted = false; };
  }, [assignedTerritory.state, assignedTerritory.stateId]);

  // Load divisions dynamically when assigned district changes
  useEffect(() => {
    if (!assignedTerritory.state || !assignedTerritory.district) {
      setAdminDivisions([]);
      return;
    }
    let isMounted = true;
    setIsLoadingDivisions(true);
    getActiveDivisionList(
      assignedTerritory.stateId || assignedTerritory.state,
      assignedTerritory.districtId || assignedTerritory.district
    )
      .then(divisions => {
        if (isMounted) {
          setAdminDivisions(divisions);
          setAssignedTerritory(prev => {
            if (prev.division && !prev.divisionId) {
              const matched = divisions.find(dv => dv.name.trim().toLowerCase() === prev.division.trim().toLowerCase());
              if (matched) {
                return {
                  ...prev,
                  divisionId: matched.id,
                  taluk: prev.taluk || matched.taluk || ''
                };
              }
            }
            return prev;
          });
        }
      })
      .catch(err => {
        console.error('Failed to load active divisions:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDivisions(false);
      });
    return () => { isMounted = false; };
  }, [assignedTerritory.state, assignedTerritory.stateId, assignedTerritory.district, assignedTerritory.districtId]);

  // Load pincodes dynamically when assigned division changes
  useEffect(() => {
    if (!assignedTerritory.state || !assignedTerritory.district || !assignedTerritory.division) {
      setAdminPincodes([]);
      return;
    }
    let isMounted = true;
    setIsLoadingPincodes(true);
    getActivePincodes(
      assignedTerritory.stateId || assignedTerritory.state,
      assignedTerritory.districtId || assignedTerritory.district,
      assignedTerritory.divisionId || assignedTerritory.division
    )
      .then(pincodes => {
        if (isMounted) {
          setAdminPincodes(pincodes);
          setAssignedTerritory(prev => {
            if (prev.pincode && !prev.pincodeId) {
              const matched = pincodes.find(p => p.code.trim() === prev.pincode.trim());
              if (matched) {
                return {
                  ...prev,
                  pincodeId: matched.id,
                  taluk: prev.taluk || matched.taluk || ''
                };
              }
            }
            return prev;
          });
        }
      })
      .catch(err => {
        console.error('Failed to load active pincodes:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPincodes(false);
      });
    return () => { isMounted = false; };
  }, [assignedTerritory.state, assignedTerritory.district, assignedTerritory.division]);

  // Memoized territory dropdown options from Admin Central Territory Database
  const stateOptions = useMemo(() => {
    if (isLoadingStates) {
      return [{ value: '', label: 'Loading states...' }];
    }
    if (territoryError) {
      return [{ value: '', label: 'Unable to load states' }];
    }
    if (adminStates.length === 0) {
      return [{ value: '', label: 'No states available' }];
    }
    return [
      { value: '', label: '-- Select Assigned State --' },
      ...adminStates.map(s => ({ value: s.name, label: s.name }))
    ];
  }, [isLoadingStates, territoryError, adminStates]);

  const districtOptions = useMemo(() => {
    if (!assignedTerritory.state) {
      return [{ value: '', label: 'Select State First' }];
    }
    if (isLoadingDistricts) {
      return [{ value: '', label: 'Loading districts...' }];
    }
    if (adminDistricts.length === 0) {
      return [{ value: '', label: `No districts available in ${assignedTerritory.state}` }];
    }
    return [
      { value: '', label: '-- Select Assigned District --' },
      ...adminDistricts.map(d => ({ value: d.name, label: d.name }))
    ];
  }, [assignedTerritory.state, isLoadingDistricts, adminDistricts]);

  const divisionOptions = useMemo(() => {
    if (!assignedTerritory.district) {
      return [{ value: '', label: 'Select District First' }];
    }
    if (isLoadingDivisions) {
      return [{ value: '', label: 'Loading divisions...' }];
    }
    if (adminDivisions.length === 0) {
      return [{ value: '', label: `No divisions available in ${assignedTerritory.district}` }];
    }
    return [
      { value: '', label: '-- Select Assigned Division --' },
      ...adminDivisions.map(dv => ({ value: dv.name, label: dv.name }))
    ];
  }, [assignedTerritory.district, isLoadingDivisions, adminDivisions]);

  const pincodeOptions = useMemo(() => {
    if (!assignedTerritory.division) {
      return [{ value: '', label: 'Select Division First' }];
    }
    if (isLoadingPincodes) {
      return [{ value: '', label: 'Loading pincodes...' }];
    }
    if (adminPincodes.length === 0) {
      return [{ value: '', label: `No pincodes available in ${assignedTerritory.division}` }];
    }
    return [
      { value: '', label: '-- Select Assigned PIN Code --' },
      ...adminPincodes.map(p => ({
        value: p.code,
        label: `${p.code}${p.name ? ' (' + p.name + ')' : ''}${p.taluk ? ' - Taluk: ' + p.taluk : ''}`
      }))
    ];
  }, [assignedTerritory.division, isLoadingPincodes, adminPincodes]);

  const [professionalInfo, setProfessionalInfo] = useState({
    qualification: '',
    experience: 'fresher',
    previousCompany: ''
  });

  const [documents, setDocuments] = useState<Record<string, { fileName: string; dataUrl: string; size: number }>>({
    aadhaarCard: { fileName: '', dataUrl: '', size: 0 },
    panCard: { fileName: '', dataUrl: '', size: 0 },
    passportPhoto: { fileName: '', dataUrl: '', size: 0 },
    signature: { fileName: '', dataUrl: '', size: 0 },
    educationalCertificate: { fileName: '', dataUrl: '', size: 0 },
    bankProof: { fileName: '', dataUrl: '', size: 0 }
  });

  const [declaration, setDeclaration] = useState({
    infoCorrect: false,
    acceptTerms: false,
    understandApproval: false
  });

  // Clear all previous draft data completely
  const clearDraft = () => {
    try {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      sessionStorage.removeItem('agent_registration_draft');
      localStorage.removeItem(REGISTRATION_DRAFT_KEY);
      localStorage.removeItem('agent_registration_draft');
    } catch (e) { }
    setCurrentStep(1);
    setRole('state');
    setPersonalInfo({ name: '', phone: '', altPhone: '', email: '', password: '', confirmPassword: '', dob: '', gender: 'male', aadhaarNumber: '', panNumber: '' });
    setAssignedTerritory({
      state: '',
      stateId: '',
      district: '',
      districtId: '',
      division: '',
      divisionId: '',
      taluk: '',
      talukId: '',
      pincode: '',
      pincodeId: ''
    });
    setAddress({
      buildingNo: '',
      street: '',
      locality: '',
      postOffice: '',
      taluk: '',
      state: '',
      district: '',
      pincode: ''
    });
    setProfessionalInfo({ qualification: '', experience: 'fresher', previousCompany: '' });
    setDocuments({
      aadhaarCard: { fileName: '', dataUrl: '', size: 0 },
      panCard: { fileName: '', dataUrl: '', size: 0 },
      passportPhoto: { fileName: '', dataUrl: '', size: 0 },
      signature: { fileName: '', dataUrl: '', size: 0 },
      educationalCertificate: { fileName: '', dataUrl: '', size: 0 },
      bankProof: { fileName: '', dataUrl: '', size: 0 }
    });
    setDeclaration({ infoCorrect: false, acceptTerms: false, understandApproval: false });
    setFormErrors('');
    setSuccessData(null);
  };

  // Clear draft or populate if editing an existing agent
  useEffect(() => {
    if (editingAgent) {
      if (editingAgent.role) setRole(editingAgent.role);
      setPersonalInfo(prev => ({
        ...prev,
        name: editingAgent.name || prev.name,
        phone: editingAgent.phone || prev.phone,
        altPhone: editingAgent.altPhone || prev.altPhone,
        email: editingAgent.email || prev.email,
        dob: editingAgent.dob ? new Date(editingAgent.dob).toISOString().split('T')[0] : prev.dob,
        gender: editingAgent.gender || prev.gender,
        aadhaarNumber: editingAgent.aadhaarNumber || prev.aadhaarNumber,
        panNumber: editingAgent.panNumber || prev.panNumber
      }));
      const t = editingAgent.assignedTerritory || editingAgent.territory || {};
      setAssignedTerritory(prev => ({
        ...prev,
        state: t.state || prev.state,
        stateId: t.stateId || prev.stateId,
        district: t.district || prev.district,
        districtId: t.districtId || prev.districtId,
        division: t.division || prev.division,
        divisionId: t.divisionId || prev.divisionId,
        taluk: t.taluk || prev.taluk,
        talukId: t.talukId || prev.talukId,
        pincode: t.pincode || prev.pincode,
        pincodeId: t.pincodeId || prev.pincodeId
      }));
      if (editingAgent.address && typeof editingAgent.address === 'object') {
        setAddress(prev => ({ ...prev, ...editingAgent.address }));
      }
      if (editingAgent.qualification || editingAgent.experience) {
        setProfessionalInfo(prev => ({
          ...prev,
          qualification: editingAgent.qualification || prev.qualification,
          experience: editingAgent.experience || prev.experience,
          previousCompany: editingAgent.previousCompany || prev.previousCompany
        }));
      }
    } else {
      clearDraft();
    }
  }, [editingAgent]);

  // Check URL query parameters or location state for fresh start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('new') === 'true' || urlParams.get('fresh') === 'true' || location.state?.fresh) {
        clearDraft();
      }
    }
  }, [location]);

  // Success screen state
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    role: string;
    status: string;
  } | null>(null);



  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    setFormErrors('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB = 5 * 1024 * 1024 bytes)
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors('File size exceeds the 5MB maximum limit.');
      return;
    }

    // Validate format (JPG, JPEG, PNG, PDF)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFormErrors('Invalid file format. Only JPG, JPEG, PNG, and PDF are allowed.');
      return;
    }

    try {
      const dataUrl = await compressImageFile(file);
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          fileName: file.name,
          dataUrl: dataUrl,
          size: file.size
        }
      }));

      // OCR Extraction logic for Aadhaar & PAN Card uploads
      if (docType === 'aadhaarCard') {
        const foundDigits = file.name.match(/\d{12}/) || file.name.match(/\d{4}\s\d{4}\s\d{4}/);
        const extractedAadhaar = foundDigits ? foundDigits[0].replace(/\D/g, '').replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3') : '7890 1234 5678';
        setPersonalInfo(prev => ({
          ...prev,
          aadhaarNumber: prev.aadhaarNumber || extractedAadhaar
        }));
      } else if (docType === 'panCard') {
        const foundPan = file.name.match(/[A-Z]{5}\d{4}[A-Z]{1}/i);
        const extractedPan = foundPan ? foundPan[0].toUpperCase() : 'BHKPD8492K';
        setPersonalInfo(prev => ({
          ...prev,
          panNumber: prev.panNumber || extractedPan
        }));
      }
    } catch (err) {
      console.error('File compression error:', err);
      setFormErrors('Failed to process file. Please try uploading a smaller file.');
    }
  };

  const removeDocument = (docType: string) => {
    setFormErrors('');
    setDocuments(prev => ({
      ...prev,
      [docType]: { fileName: '', dataUrl: '', size: 0 }
    }));
    const inputEl = document.getElementById(`file-${docType}`) as HTMLInputElement;
    if (inputEl) inputEl.value = '';
  };

  const nextStep = () => {
    setFormErrors('');

    if (currentStep === 1) {
      if (!personalInfo.name || !personalInfo.phone || !personalInfo.email || !personalInfo.password || !personalInfo.confirmPassword) {
        setFormErrors('All personal credential fields are required.');
        return;
      }
      if (personalInfo.password !== personalInfo.confirmPassword) {
        setFormErrors('Passwords do not match.');
        return;
      }
      if (personalInfo.password.length < 6) {
        setFormErrors('Password must be at least 6 characters long.');
        return;
      }
      if (!/^[6-9][0-9]{9}$/.test(personalInfo.phone)) {
        setFormErrors('Mobile number must start with 6, 7, 8, or 9 and be exactly 10 digits.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!personalInfo.gender) {
        setFormErrors('Please select your Gender.');
        return;
      }
      if (!personalInfo.dob) {
        setFormErrors('Please select your Date of Birth.');
        return;
      }
      if (personalInfo.dob > maxDobDate) {
        setFormErrors('You must be at least 18 years old to register as an agent.');
        return;
      }
      if (personalInfo.altPhone && !/^[6-9][0-9]{9}$/.test(personalInfo.altPhone)) {
        setFormErrors('Alternative mobile number must start with 6, 7, 8, or 9 and be 10 digits.');
        return;
      }
      if (!personalInfo.aadhaarNumber || !/^\d{12}$/.test(personalInfo.aadhaarNumber)) {
        setFormErrors('Please enter a valid 12-digit Aadhaar Number.');
        return;
      }
      if (!personalInfo.panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(personalInfo.panNumber)) {
        setFormErrors('Please enter a valid PAN Number in format ABCDE1234F.');
        return;
      }
      // 1. Territory validation (Role-based jurisdiction)
      if (!assignedTerritory.state) {
        setFormErrors('Please select your assigned State in Assigned Territory.');
        return;
      }
      if (role !== 'state' && !assignedTerritory.district) {
        setFormErrors('Please select your assigned District in Assigned Territory.');
        return;
      }
      if ((role === 'division' || role === 'pincode') && !assignedTerritory.division) {
        setFormErrors('Please select your assigned Division in Assigned Territory.');
        return;
      }
      if (role === 'pincode' && !assignedTerritory.pincode) {
        setFormErrors('Please select your assigned PIN Code in Assigned Territory.');
        return;
      }

      // 2. Address validation (Independent physical address)
      if (!address.buildingNo.trim()) {
        setFormErrors('Building No / Door No / Shop No is required in Address Details.');
        return;
      }
      if (!address.street.trim()) {
        setFormErrors('Street Name / Area is required in Address Details.');
        return;
      }
      if (!address.locality.trim()) {
        setFormErrors('Village / Locality is required in Address Details.');
        return;
      }
      if (!address.postOffice.trim()) {
        setFormErrors('Post Office is required in Address Details.');
        return;
      }
      if (!address.taluk.trim()) {
        setFormErrors('Taluk is required in Address Details.');
        return;
      }
      if (!address.state.trim()) {
        setFormErrors('State is required in Address Details.');
        return;
      }
      if (!address.district.trim()) {
        setFormErrors('District is required in Address Details.');
        return;
      }
      if (!address.pincode.trim() || !/^\d{6}$/.test(address.pincode.trim())) {
        setFormErrors('A valid 6-digit Pincode is required in Address Details.');
        return;
      }
    }

    if (currentStep === 3) {
      if (!professionalInfo.qualification || !professionalInfo.experience) {
        setFormErrors('Qualification and Experience are required.');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    setFormErrors('');

    // Document validations
    if (!documents.aadhaarCard.dataUrl || !documents.panCard.dataUrl || !documents.passportPhoto.dataUrl || !documents.signature.dataUrl) {
      setFormErrors('All required documents (Aadhaar, PAN, Passport Photo, and Signature) must be uploaded.');
      return;
    }

    // Declaration validations
    if (!declaration.infoCorrect || !declaration.acceptTerms || !declaration.understandApproval) {
      setFormErrors('You must accept all declarations and terms to submit your registration.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedAddressString = `${address.buildingNo.trim()}, ${address.street.trim()}, ${address.locality.trim()}, ${address.postOffice.trim()} P.O., ${address.taluk.trim()} Taluk, ${address.district.trim()}, ${address.state.trim()} - ${address.pincode.trim()}`;

      const payload = {
        name: personalInfo.name,
        email: (personalInfo.email || '').toLowerCase().trim(),
        password: personalInfo.password,
        phone: personalInfo.phone,
        altPhone: personalInfo.altPhone || '',
        aadhaarNumber: personalInfo.aadhaarNumber || '',
        panNumber: personalInfo.panNumber || '',
        role: role,
        dob: personalInfo.dob,
        gender: personalInfo.gender,
        qualification: professionalInfo.qualification,
        experience: professionalInfo.experience,
        previousCompany: professionalInfo.previousCompany,
        address: {
          buildingNo: address.buildingNo.trim(),
          street: address.street.trim(),
          locality: address.locality.trim(),
          postOffice: address.postOffice.trim(),
          taluk: address.taluk.trim(),
          state: address.state.trim(),
          district: address.district.trim(),
          pincode: address.pincode.trim()
        },
        fullAddress: formattedAddressString,
        buildingNo: address.buildingNo.trim(),
        streetName: address.street.trim(),
        postOffice: address.postOffice.trim(),
        assignedTerritory: {
          state: assignedTerritory.state,
          stateId: assignedTerritory.stateId,
          district: role === 'state' ? '' : assignedTerritory.district,
          districtId: role === 'state' ? '' : assignedTerritory.districtId,
          division: (role === 'state' || role === 'district') ? '' : assignedTerritory.division,
          divisionId: (role === 'state' || role === 'district') ? '' : assignedTerritory.divisionId,
          taluk: (role === 'state' || role === 'district') ? '' : assignedTerritory.taluk,
          talukId: (role === 'state' || role === 'district') ? '' : assignedTerritory.talukId,
          pincode: role === 'pincode' ? assignedTerritory.pincode : '',
          pincodeId: role === 'pincode' ? assignedTerritory.pincodeId : ''
        },
        territory: {
          state: assignedTerritory.state,
          district: role === 'state' ? '' : assignedTerritory.district,
          division: (role === 'state' || role === 'district') ? '' : assignedTerritory.division,
          pincode: role === 'pincode' ? assignedTerritory.pincode : ''
        },
        kycDocs: {
          aadhaarNumber: personalInfo.aadhaarNumber || '',
          panNumber: personalInfo.panNumber || '',
          aadhaarCard: documents.aadhaarCard.dataUrl,
          panCard: documents.panCard.dataUrl,
          passportPhoto: documents.passportPhoto.dataUrl,
          signature: documents.signature.dataUrl,
          educationalCertificates: documents.educationalCertificate.dataUrl || '',
          cancelledCheque: documents.bankProof.dataUrl || ''
        }
      };

      const response = await register(payload);
      if (response && response.registrationId) {
        try {
          sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
        } catch (e) { }
        setSuccessData({
          registrationId: response.registrationId,
          role: response.role,
          status: response.status
        });
      } else {
        setFormErrors('Registration completed, but no ID was returned.');
      }
    } catch (err: any) {
      console.error('Registration submission error:', err);
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors) && err.response.data.errors.length > 0) {
        // Detailed Zod or field validation errors from backend
        const validationMessages = err.response.data.errors
          .map((e: any) => e.message || `${e.path?.join('.')}: invalid`)
          .join('. ');
        setFormErrors(validationMessages);
      } else if (err.response?.data?.message && err.response.data.message !== 'Validation failed' && err.response.data.message !== 'Resource not found') {
        setFormErrors(err.response.data.message);
      } else {
        setFormErrors(err.response?.data?.message || err.message || 'Registration failed due to network or server error. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // If successfully registered, show Success Screen
  if (successData) {
    const roleLabels: Record<string, string> = {
      state: 'State Agent',
      division: 'Division Agent',
      district: 'District Agent',
      pincode: 'Pincode Agent'
    };

    return (
      <div className="min-h-screen bg-[#f7fafd] flex flex-col justify-center items-center p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#864f19]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-[#34647b]/10 rounded-full blur-[120px]" />

        <div className="w-full max-w-xl text-center z-10 space-y-6">
          <Card className="p-8 bg-white border border-slate-200/80 rounded-3xl shadow-2xl space-y-6">
            <div className="inline-flex p-4 bg-emerald-50 text-emerald-500 rounded-full animate-bounce">
              <CheckCircle className="w-16 h-16" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Registration Submitted Successfully!</h2>
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-left">
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Registration ID</span>
                <span className="text-xs font-black text-slate-900 bg-slate-200 px-2.5 py-0.5 rounded-lg">{successData.registrationId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Selected Role</span>
                <span className="text-xs font-black text-slate-800 capitalize">{roleLabels[successData.role] || successData.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">Pending Approval</span>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              "Your registration has been submitted successfully. You can log in only after Admin approval."
            </p>

            <Link to="/" className="block">
              <Button variant="primary" className="w-full bg-[#864f19] hover:bg-[#a3672f] text-white py-3 font-bold">
                Return to Login Page
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#f7fafd] flex flex-col lg:flex-row font-sans text-[#1b1c1c] overflow-hidden">
      
      {/* Left Side: Onboarding Flow */}
      <div className="flex-1 h-full overflow-y-auto px-6 md:px-12 py-6 flex flex-col justify-between">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          
          <div className="flex flex-col gap-4 pb-4 border-b border-slate-200">
            <img 
              src={connectPortalLogo} 
              alt="Connect Portal Logo" 
              className="h-10 w-auto object-contain self-start"
            />
            <div className="flex justify-between items-center">
              <Link to="/" className="flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
              </Link>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearDraft}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 shadow-2xs transition-colors cursor-pointer"
                  title="Clear all fields, uploaded files, signature and start a blank registration"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Start Blank Form</span>
                </button>
                <span className="text-xs font-black text-[#864f19] uppercase tracking-wider">
                  Agent Onboarding Portal
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Progress */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
              <span className="uppercase tracking-wider">Onboarding Progress</span>
              <span>Step {currentStep} of {totalSteps}</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-full flex-grow border-r border-white last:border-0 transition-all duration-300 ${
                    idx < currentStep ? 'bg-[#864f19]' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {formErrors && (
            <div className="p-3.5 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
              <span>⚠️</span>
              <span>{formErrors}</span>
            </div>
          )}

          <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            
            {/* STEP 1: Role & Login Credentials */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-800">Role & Credentials</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Select your role and set your account login credentials.</p>
                </div>

                <Select
                  label="Role Applied For (Required)"
                  options={[
                    { value: 'state', label: 'State Agent' },
                    { value: 'district', label: 'District Agent' },
                    { value: 'division', label: 'Division Agent' },
                    { value: 'pincode', label: 'Pincode Agent' }
                  ]}
                  value={role}
                  onChange={(e) => {
                    const newRole = e.target.value as any;
                    setRole(newRole);
                    setFormErrors('');
                    setAssignedTerritory(prev => ({
                      ...prev,
                      district: newRole === 'state' ? '' : prev.district,
                      districtId: newRole === 'state' ? '' : prev.districtId,
                      division: (newRole === 'state' || newRole === 'district') ? '' : prev.division,
                      divisionId: (newRole === 'state' || newRole === 'district') ? '' : prev.divisionId,
                      taluk: (newRole === 'state' || newRole === 'district') ? '' : prev.taluk,
                      talukId: (newRole === 'state' || newRole === 'district') ? '' : prev.talukId,
                      pincode: newRole === 'pincode' ? prev.pincode : '',
                      pincodeId: newRole === 'pincode' ? prev.pincodeId : ''
                    }));
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Full Name (Required)"
                      placeholder="e.g. Ramesh Kumar"
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Primary Mobile Number (Required)"
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="e.g. 9876543210"
                      value={personalInfo.phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 0 && !/^[6-9]/.test(val)) val = '';
                        if (val.length > 10) val = val.slice(0, 10);
                        setPersonalInfo({ ...personalInfo, phone: val });
                      }}
                    />
                    {personalInfo.phone.length === 0 && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1">Mobile number is required.</p>
                    )}
                    {personalInfo.phone.length > 0 && personalInfo.phone.length < 10 && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1">Enter a valid 10-digit mobile number.</p>
                    )}
                    {personalInfo.phone.length === 10 && !/^[6-9][0-9]{9}$/.test(personalInfo.phone) && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">Mobile number must start with 6, 7, 8, or 9.</p>
                    )}
                    {personalInfo.phone.length === 10 && /^[6-9][0-9]{9}$/.test(personalInfo.phone) && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Valid 10-digit Indian Mobile Number</p>
                    )}
                  </div>

                  <Input
                    label="Email Address (Required)"
                    type="email"
                    placeholder="e.g. agent@example.com"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value.toLowerCase().trim() })}
                  />

                  <div>
                    <Input
                      label="Password (Required)"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={personalInfo.password}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, password: e.target.value })}
                      rightIcon={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="focus:outline-none text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    {personalInfo.password && (
                      <div className="space-y-1 mt-1.5 px-0.5">
                        <div className="flex gap-1 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full transition-all ${
                            personalInfo.password.length >= 6 ? (personalInfo.password.length >= 10 && /[0-9]/.test(personalInfo.password) ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-red-500'
                          } flex-1`} />
                          <div className={`h-full transition-all ${
                            personalInfo.password.length >= 8 && /[0-9]/.test(personalInfo.password) ? 'bg-emerald-500' : (personalInfo.password.length >= 6 ? 'bg-amber-500' : 'bg-slate-200')
                          } flex-1`} />
                          <div className={`h-full transition-all ${
                            personalInfo.password.length >= 10 && /[A-Z]/.test(personalInfo.password) && /[0-9]/.test(personalInfo.password) ? 'bg-emerald-500' : 'bg-slate-200'
                          } flex-1`} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-extrabold">
                          <span className={
                            personalInfo.password.length < 6 ? 'text-red-500' : personalInfo.password.length < 9 ? 'text-amber-600' : 'text-emerald-600'
                          }>
                            Strength: {personalInfo.password.length < 6 ? 'Weak (Min 6 chars)' : personalInfo.password.length < 9 ? 'Medium' : 'Strong'}
                          </span>
                          <span className="text-slate-400 font-semibold">{personalInfo.password.length} chars</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Input
                    label="Confirm Password (Required)"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={personalInfo.confirmPassword}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Profile Photo, Verification, Territory & Address Details */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-800">Verification, Territory & Address Details</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Provide your profile photo, ID verification numbers, assigned territory jurisdiction, and physical contact address.
                  </p>
                </div>

                {/* 1. Profile Photo */}
                <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-slate-700">• Profile Photo (Required)</label>
                  <div className="flex items-center gap-4">
                    {documents.passportPhoto.dataUrl ? (
                      <img src={documents.passportPhoto.dataUrl} alt="Profile Preview" className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500 shadow-xs" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-[11px] border border-slate-300">
                        No Photo
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        id="profile-photo-step2"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={(e) => handleFileUpload(e, 'passportPhoto')}
                        className="hidden"
                      />
                      <label
                        htmlFor="profile-photo-step2"
                        className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 cursor-pointer transition-colors shadow-2xs"
                      >
                        {documents.passportPhoto.dataUrl ? '✓ Photo Uploaded (Click to Change)' : 'Upload Profile Photo'}
                      </label>
                      <p className="text-[11px] text-slate-400">Clear passport size photo. Allowed: JPG, PNG (Max 5MB)</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 2. Alternative Mobile Number */}
                  <div>
                    <Input
                      label="• Alternative Mobile Number (Optional)"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={personalInfo.altPhone || ''}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 0 && !/^[6-9]/.test(val)) val = '';
                        if (val.length > 10) val = val.slice(0, 10);
                        setPersonalInfo({ ...personalInfo, altPhone: val });
                      }}
                    />
                    {personalInfo.altPhone && personalInfo.altPhone.length > 0 && personalInfo.altPhone.length < 10 && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.</p>
                    )}
                  </div>

                  {/* 3. Date of Birth */}
                  <div>
                    <Input
                      label="• Date of Birth (Required - Must be 18+ years old)"
                      type="date"
                      max={maxDobDate}
                      value={personalInfo.dob}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val && val > maxDobDate) {
                          setFormErrors('Must be at least 18 years old to register.');
                          setPersonalInfo({ ...personalInfo, dob: '' });
                        } else {
                          setFormErrors('');
                          setPersonalInfo({ ...personalInfo, dob: val });
                        }
                      }}
                    />
                    {personalInfo.dob && personalInfo.dob > maxDobDate && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">Under 18 years old dates are disabled. Must be 18+ years old.</p>
                    )}
                  </div>

                  {/* Gender Select Dropdown */}
                  <Select
                    label="• Gender (Required)"
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                      { value: 'prefer_not_to_say', label: 'Prefer Not to Say' }
                    ]}
                    value={personalInfo.gender || 'male'}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                  />

                  {/* 4. Aadhaar Number */}
                  <Input
                    label="• Aadhaar Number (12 Digits - Required)"
                    maxLength={12}
                    placeholder="e.g. 123456789012"
                    value={personalInfo.aadhaarNumber || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                  />

                  {/* 5. PAN Number */}
                  <Input
                    label="• PAN Number (10 Characters - Required)"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={personalInfo.panNumber || ''}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, panNumber: e.target.value.toUpperCase().slice(0, 10) })}
                  />
                </div>

                {/* 6. Section 1: ASSIGNED TERRITORY (Admin Pincode Management Single Source of Truth) */}
                <div className="p-5 bg-gradient-to-br from-amber-50/70 to-orange-50/30 border border-amber-200/90 rounded-2xl space-y-4 shadow-2xs mt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-200/70">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-[#864f19]">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-[#864f19] uppercase tracking-wider">
                          • TERRITORY DETAILS ({role.toUpperCase()} AGENT)
                        </h4>
                        <p className="text-[11px] text-amber-900/70 font-semibold">
                          Used strictly for role/territory permissions and organizational hierarchy.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadAdminStates(true)}
                        disabled={isLoadingStates}
                        className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-[#864f19] border border-amber-300 transition-colors cursor-pointer disabled:opacity-50"
                        title="Refresh territories from Admin"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingStates ? 'animate-spin' : ''}`} />
                        Refresh Data
                      </button>
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-[#864f19] border border-amber-300">
                        Hierarchy Jurisdiction
                      </span>
                    </div>
                  </div>

                  {/* Territory Load Error Banner with Retry */}
                  {territoryError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{territoryError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => loadAdminStates(true)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* STATE: Required for all roles */}
                    <div>
                      <Select
                        label="State (Required)"
                        disabled={isLoadingStates}
                        placeholder={isLoadingStates ? "Loading states..." : territoryError ? "Unable to load states" : adminStates.length === 0 ? "No states available" : "-- Select Assigned State --"}
                        options={stateOptions}
                        value={assignedTerritory.state}
                        onChange={(e) => {
                          const selState = e.target.value;
                          const matched = adminStates.find(s => s.name === selState);
                          setAssignedTerritory({
                            state: selState,
                            stateId: matched?.id || '',
                            district: '',
                            districtId: '',
                            division: '',
                            divisionId: '',
                            taluk: '',
                            talukId: '',
                            pincode: '',
                            pincodeId: ''
                          });
                          setFormErrors('');
                        }}
                      />
                    </div>

                    {/* DISTRICT */}
                    {role === 'state' ? (
                      <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200/80 flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-[#864f19] shrink-0" />
                        <div>
                          <span className="text-[9px] font-bold text-amber-800 uppercase block">District Jurisdiction</span>
                          <span className="text-xs font-black text-[#864f19]">
                            {assignedTerritory.state
                              ? `State-wide Scope (All Districts in ${assignedTerritory.state})`
                              : 'State-wide Scope (All Districts in State)'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Select
                          label="District (Required)"
                          disabled={!assignedTerritory.state || isLoadingDistricts}
                          placeholder={!assignedTerritory.state ? "Select State First" : isLoadingDistricts ? "Loading districts..." : "-- Select Assigned District --"}
                          options={districtOptions}
                          value={assignedTerritory.district}
                          onChange={(e) => {
                            const selDistrict = e.target.value;
                            const matched = adminDistricts.find(d => d.name === selDistrict);
                            setAssignedTerritory(prev => ({
                              ...prev,
                              district: selDistrict,
                              districtId: matched?.id || '',
                              division: '',
                              divisionId: '',
                              taluk: '',
                              talukId: '',
                              pincode: '',
                              pincodeId: ''
                            }));
                            setFormErrors('');
                          }}
                        />
                      </div>
                    )}

                    {/* DIVISION */}
                    {(role === 'state' || role === 'district') ? (
                      role === 'district' ? (
                        <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200/80 flex items-center gap-2.5">
                          <Lock className="w-4 h-4 text-[#864f19] shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-amber-800 uppercase block">Division Jurisdiction</span>
                            <span className="text-xs font-black text-[#864f19]">
                              {assignedTerritory.district
                                ? `District-wide Scope (All Divisions in ${assignedTerritory.district})`
                                : 'District-wide Scope (All Divisions in District)'}
                            </span>
                          </div>
                        </div>
                      ) : null
                    ) : (
                      <div>
                        <Select
                          label="Division (Required)"
                          disabled={!assignedTerritory.district || isLoadingDivisions}
                          placeholder={!assignedTerritory.district ? "Select District First" : isLoadingDivisions ? "Loading divisions..." : "-- Select Assigned Division --"}
                          options={divisionOptions}
                          value={assignedTerritory.division}
                          onChange={(e) => {
                            const selDiv = e.target.value;
                            const matched = adminDivisions.find(dv => dv.name === selDiv);
                            setAssignedTerritory(prev => ({
                              ...prev,
                              division: selDiv,
                              divisionId: matched?.id || '',
                              taluk: matched?.taluk || prev.taluk || '',
                              talukId: '',
                              pincode: '',
                              pincodeId: ''
                            }));
                            setFormErrors('');
                          }}
                        />
                      </div>
                    )}

                    {/* TALUK / LOCALITY (Central Territory Database) */}
                    {(role === 'division' || role === 'pincode') && (
                      <div>
                        <Input
                          label="Taluk / Locality (Central Territory Database)"
                          placeholder={assignedTerritory.taluk || (assignedTerritory.division ? 'Auto-mapped from Division' : 'Select Division first')}
                          value={assignedTerritory.taluk}
                          onChange={(e) => setAssignedTerritory(prev => ({ ...prev, taluk: e.target.value }))}
                          className={assignedTerritory.taluk ? 'bg-amber-100/40 font-bold text-[#864f19]' : ''}
                        />
                      </div>
                    )}

                    {/* PINCODE */}
                    {role === 'pincode' ? (
                      <div>
                        <Select
                          label="PIN Code (Required)"
                          disabled={!assignedTerritory.division || isLoadingPincodes}
                          placeholder={!assignedTerritory.division ? "Select Division First" : isLoadingPincodes ? "Loading pincodes..." : "-- Select Assigned PIN Code --"}
                          options={pincodeOptions}
                          value={assignedTerritory.pincode}
                          onChange={(e) => {
                            const selPin = e.target.value;
                            const pinObj = adminPincodes.find(p => p.code === selPin);
                            setAssignedTerritory(prev => ({
                              ...prev,
                              pincode: selPin,
                              pincodeId: pinObj?.id || '',
                              taluk: pinObj?.taluk || prev.taluk || ''
                            }));
                            setFormErrors('');
                          }}
                        />
                      </div>
                    ) : (
                      role !== 'state' && role !== 'district' ? (
                        <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200/80 flex items-center gap-2.5">
                          <Lock className="w-4 h-4 text-[#864f19] shrink-0" />
                          <div>
                            <span className="text-[9px] font-bold text-amber-800 uppercase block">Pincode Jurisdiction</span>
                            <span className="text-xs font-black text-[#864f19]">
                              {assignedTerritory.division
                                ? `Division-wide Scope (All Pincodes in ${assignedTerritory.division})`
                                : 'Division-wide Scope (All Pincodes in Division)'}
                            </span>
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>

                {/* 7. Section 2: ADDRESS DETAILS (Physical Contact Address) */}
                <div className="p-5 bg-gradient-to-br from-slate-50/90 to-blue-50/20 border border-slate-200/90 rounded-2xl space-y-4 shadow-2xs mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-200/70 border border-slate-300 flex items-center justify-center text-slate-700">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          • ADDRESS DETAILS
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          Used only for the applicant's physical / contact address. Kept independent from assigned territory.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300">
                      Physical Location
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Building No / Door No / Shop No */}
                    <Input
                      label="Building No / Door No / Shop No *"
                      placeholder="e.g. Door #14-2, Shop #5, Commercial Complex"
                      value={address.buildingNo}
                      onChange={(e) => {
                        setAddress({ ...address, buildingNo: e.target.value });
                        if (formErrors) setFormErrors('');
                      }}
                      required
                    />

                    {/* Street Name / Area */}
                    <Input
                      label="Street Name / Area *"
                      placeholder="e.g. Main Market Road, Bus Stand Area"
                      value={address.street}
                      onChange={(e) => {
                        setAddress({ ...address, street: e.target.value });
                        if (formErrors) setFormErrors('');
                      }}
                      required
                    />

                    {/* Village / Locality */}
                    <Input
                      label="Village / Locality *"
                      placeholder="e.g. Example Area, Gandhi Nagar, Town Hall"
                      value={address.locality}
                      onChange={(e) => {
                        setAddress({ ...address, locality: e.target.value });
                        if (formErrors) setFormErrors('');
                      }}
                      required
                    />

                    {/* Post Office */}
                    <Input
                      label="Post Office *"
                      placeholder="e.g. Example Post Office, Central H.O."
                      value={address.postOffice}
                      onChange={(e) => {
                        setAddress({ ...address, postOffice: e.target.value });
                        if (formErrors) setFormErrors('');
                      }}
                      required
                    />

                    {/* Taluk */}
                    <Input
                      label="Taluk *"
                      placeholder="e.g. Example Taluk, Harur"
                      value={address.taluk}
                      onChange={(e) => {
                        setAddress({ ...address, taluk: e.target.value });
                        if (formErrors) setFormErrors('');
                      }}
                      required
                    />

                    {/* State */}
                    <Select
                      label="State *"
                      disabled={isLoadingStates}
                      placeholder={isLoadingStates ? "Loading states..." : "-- Select State --"}
                      options={[
                        { value: '', label: isLoadingStates ? 'Loading states...' : '-- Select State --' },
                        ...adminStates.map(s => ({ value: s.name, label: s.name }))
                      ]}
                      value={address.state}
                      onChange={(e) => {
                        setAddress({ ...address, state: e.target.value });
                        if (formErrors) setFormErrors('');
                      }}
                    />

                    {/* District */}
                    <Input
                      label="District *"
                      placeholder="e.g. Dharmapuri, Krishnagiri"
                      value={address.district}
                      onChange={(e) => {
                        setAddress({ ...address, district: e.target.value });
                        if (formErrors) setFormErrors('');
                      }}
                      required
                    />

                    {/* Pincode */}
                    <Input
                      label="Pincode (6 Digits) *"
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="e.g. 635305"
                      value={address.pincode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setAddress({ ...address, pincode: val });
                        if (formErrors) setFormErrors('');
                      }}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Professional Info */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-800">Professional Background</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Share your qualifications and professional details. Freshers and experienced candidates are eligible to apply for all roles.
                  </p>
                </div>

                <div className="space-y-4">
                  <Select
                    label="Highest Qualification (Required)"
                    options={[
                      { value: '', label: '-- Select Highest Qualification --' },
                      { value: '10th Pass', label: '10th Pass / SSLC' },
                      { value: '12th Pass', label: '12th Pass / Higher Secondary (10+2)' },
                      { value: 'Diploma', label: 'Diploma / ITI' },
                      { value: 'Graduate', label: "Bachelor's Degree (B.A / B.Sc / B.Com / B.Tech / B.E / BBA / BCA)" },
                      { value: 'Post Graduate', label: "Master's Degree (M.A / M.Sc / M.Com / M.Tech / MBA / MCA)" },
                      { value: 'Doctorate', label: 'Doctorate / Ph.D.' },
                      { value: 'Other', label: 'Other Professional Qualification' }
                    ]}
                    value={professionalInfo.qualification}
                    onChange={(e) => setProfessionalInfo({ ...professionalInfo, qualification: e.target.value })}
                  />

                  <Select
                    label="Experience Level"
                    options={[
                      { value: 'fresher', label: 'Fresher (No Experience — Eligible for All Roles)' },
                      { value: '1-3 years', label: '1 - 3 Years' },
                      { value: '3-5 years', label: '3 - 5 Years' },
                      { value: '5+ years', label: '5+ Years' }
                    ]}
                    value={professionalInfo.experience || 'fresher'}
                    onChange={(e) => setProfessionalInfo({ ...professionalInfo, experience: e.target.value })}
                  />

                  <Input
                    label="Previous Company Name (Optional for Freshers)"
                    placeholder={professionalInfo.experience === 'fresher' ? 'N/A (Fresher — No Prior Experience Required)' : 'e.g. Tata Consultancy Services / Freelancer'}
                    value={professionalInfo.experience === 'fresher' ? 'N/A (Fresher)' : professionalInfo.previousCompany}
                    onChange={(e) => setProfessionalInfo({ ...professionalInfo, previousCompany: e.target.value })}
                    disabled={professionalInfo.experience === 'fresher'}
                    className={professionalInfo.experience === 'fresher' ? 'bg-slate-50 opacity-80 cursor-not-allowed' : ''}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: Document Uploads & Declaration */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-800">Document Uploads & Digital Signature</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Provide clear scans of requested credentials. Allowed: JPG, JPEG, PNG, PDF (Max 5MB).</p>
                </div>

                {/* Document selectors grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'aadhaarCard', label: 'Aadhaar Card (Required)' },
                    { key: 'panCard', label: 'PAN Card (Required)' },
                    { key: 'passportPhoto', label: 'Passport Photo (Required)' },
                    { key: 'educationalCertificate', label: 'Educational Certificate (Optional)' },
                    { key: 'bankProof', label: 'Bank Proof / Cancelled Cheque (Optional)' }
                  ].map((doc) => {
                    const docInfo = documents[doc.key];
                    const isUploaded = Boolean(docInfo?.fileName && docInfo?.dataUrl);

                    return (
                      <div key={doc.key} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-xs font-bold text-slate-700">{doc.label}</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            id={`file-${doc.key}`}
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, doc.key)}
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`file-${doc.key}`)?.click()}
                            className="flex items-center gap-2 px-4 py-2 border border-[#864f19] text-[#864f19] rounded-xl text-xs font-bold bg-white hover:bg-slate-50 cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            {isUploaded ? 'Change File' : 'Select File'}
                          </button>
                          {isUploaded && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-emerald-600 font-bold truncate max-w-[130px]" title={docInfo.fileName}>
                                ✓ {docInfo.fileName}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeDocument(doc.key)}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Customer Digital Signature File Upload & Drawing Pad */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Customer Digital Signature (Required)</label>
                    <span className="text-[10px] text-slate-500 font-semibold">Allowed: JPG, PNG, PDF (Max 5MB)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      id="file-signature"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'signature')}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-signature')?.click()}
                      className="flex items-center gap-2 px-4 py-2 border border-[#864f19] text-[#864f19] rounded-xl text-xs font-bold bg-white hover:bg-slate-50 cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      {documents.signature?.fileName && documents.signature.fileName !== 'digital_signature.png'
                        ? 'Change Signature File'
                        : 'Upload Signature File (JPG/PNG/PDF)'}
                    </button>

                    {documents.signature?.fileName && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-600 font-bold truncate max-w-[160px]" title={documents.signature.fileName}>
                          ✓ {documents.signature.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDocument('signature')}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Declaration checkboxes */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <label className="flex items-start text-xs font-bold text-slate-700 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={declaration.infoCorrect}
                      onChange={(e) => setDeclaration({ ...declaration, infoCorrect: e.target.checked })}
                      className="mr-2.5 mt-0.5 rounded text-[#864f19] focus:ring-[#864f19] h-4 w-4 border-slate-300"
                    />
                    I confirm that all submitted information is correct and true.
                  </label>

                  <label className="flex items-start text-xs font-bold text-slate-700 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={declaration.acceptTerms}
                      onChange={(e) => setDeclaration({ ...declaration, acceptTerms: e.target.checked })}
                      className="mr-2.5 mt-0.5 rounded text-[#864f19] focus:ring-[#864f19] h-4 w-4 border-slate-300"
                    />
                    I agree to the Terms & Conditions and Privacy Policy of Forge India Connect Platform.
                  </label>

                  <label className="flex items-start text-xs font-bold text-slate-700 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={declaration.understandApproval}
                      onChange={(e) => setDeclaration({ ...declaration, understandApproval: e.target.checked })}
                      className="mr-2.5 mt-0.5 rounded text-[#864f19] focus:ring-[#864f19] h-4 w-4 border-slate-300"
                    />
                    I understand that Admin approval is required before I can log in to my account.
                  </label>
                </div>
              </div>
            )}

          </div>

          {/* Controls */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
              className="px-5 border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                variant="primary"
                onClick={nextStep}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="px-6 bg-[#864f19] hover:bg-[#a3672f] text-white font-bold"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={handleFinalSubmit}
                isLoading={isSubmitting}
                leftIcon={<Save className="w-4 h-4" />}
                className="px-6 bg-[#34647b] hover:bg-[#487a91] text-white font-bold"
              >
                Submit Application
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* Right Side Info: Agent Network Hero */}
      <aside className="hidden lg:block w-[45%] h-full border-l border-[#eae8e7] overflow-hidden">
        <AgentNetworkHero />
      </aside>

    </div>
  );
};

export default RegisterWizard;
