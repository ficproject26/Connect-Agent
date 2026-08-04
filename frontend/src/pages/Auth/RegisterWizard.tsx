import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { SignaturePad } from '../../components/ui/SignaturePad';
import { ArrowLeft, ArrowRight, Save, Shield, FileText, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { AgentNetworkHero } from '../../components/auth/AgentNetworkHero';
import connectPortalLogo from '../../assets/connect_portal_logo.png';

const ALL_INDIAN_STATES = [
  "Tamil Nadu",
  "Karnataka",
  "Kerala",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Uttar Pradesh",
  "West Bengal",
  "Rajasthan",
  "Madhya Pradesh",
  "Punjab",
  "Haryana",
  "Bihar",
  "Odisha",
  "Assam"
];

const STATE_DISTRICTS: Record<string, string[]> = {
  "Tamil Nadu": ["Krishnagiri", "Dharmapuri", "Chennai", "Coimbatore", "Salem", "Tiruchirappalli", "Madurai", "Vellore", "Erode", "Tirunelveli", "Kanchipuram", "Thanjavur", "Cuddalore", "Dindigul", "Theni", "Tiruppur"],
  "Karnataka": ["Bengaluru Urban", "Bengaluru Rural", "Mysuru", "Tumakuru", "Dakshina Kannada", "Hubballi-Dharwad", "Belagavi", "Mangaluru", "Ballari", "Shivamogga", "Udupi", "Kolar", "Mandya", "Hassan"],
  "Kerala": ["Ernakulam", "Thiruvananthapuram", "Kozhikode", "Thrissur", "Kollam", "Kottayam", "Palakkad", "Malappuram", "Kannur", "Alappuzha", "Idukki", "Wayanad", "Kasaragod", "Pathanamthitta"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "NTR District", "Tirupati", "Nellore", "Kakinada", "Kurnool", "Anantapur", "Kadapa", "Eluru", "Ongole"],
  "Telangana": ["Hyderabad", "Rangareddy", "Medchal-Malkajgiri", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahabubnagar", "Nalgonda", "Sangareddy"],
  "Maharashtra": ["Mumbai City", "Mumbai Suburban", "Pune", "Thane", "Nagpur", "Nashik", "Chhatrapati Sambhaji Nagar (Aurangabad)", "Solapur", "Kolhapur", "Navi Mumbai"],
  "Delhi": ["New Delhi", "Central Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi", "Gurugram / NCR", "Noida / NCR"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Anand"],
  "Uttar Pradesh": ["Lucknow", "Noida / Gautam Buddha Nagar", "Ghaziabad", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", "Gorakhpur", "Bareilly"],
  "West Bengal": ["Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas", "Hooghly", "Darjeeling", "Siliguri", "Paschim Bardhaman"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Bhilwara", "Alwar"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Gwalior", "Jabalpur", "Ujjain", "Sagar"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali (SAS Nagar)", "Bathinda"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal", "Hisar", "Rohtak"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia"],
  "Odisha": ["Khordha (Bhubaneswar)", "Cuttack", "Ganjam", "Sundargarh (Rourkela)", "Puri", "Sambalpur"],
  "Assam": ["Kamrup Metropolitan (Guwahati)", "Dibrugarh", "Silchar", "Jorhat", "Nagaon"]
};

const DISTRICT_DIVISIONS: Record<string, string[]> = {
  "Krishnagiri": ["Hosur Division", "Krishnagiri Division", "Denkanikottai Division", "Pochampalli Division"],
  "Dharmapuri": ["Dharmapuri Division", "Harur Division", "Palacode Division"],
  "Chennai": ["Chennai Central Division", "Chennai North Division", "Chennai South Division", "Adyar Division", "Anna Nagar Division"],
  "Coimbatore": ["Coimbatore North Division", "Coimbatore South Division", "Pollachi Division"],
  "Salem": ["Salem Urban Division", "Salem West Division", "Attur Division"],
  "Tiruchirappalli": ["Trichy East Division", "Trichy West Division", "Srirangam Division"],
  "Madurai": ["Madurai North Division", "Madurai South Division", "Tirumangalam Division"],
  "Vellore": ["Vellore Division", "Gudiyatham Division", "Ranipet Division"],

  "Bengaluru Urban": ["Bengaluru South Division", "Bengaluru North Division", "Bengaluru East Division", "Bengaluru West Division", "Electronic City Division", "Whitefield Division"],
  "Bengaluru Rural": ["Nelamangala Division", "Doddaballapura Division", "Devanahalli Division"],
  "Mysuru": ["Mysuru City Division", "Mysuru Rural Division", "Nanjangud Division", "Hunsur Division"],
  "Tumakuru": ["Tumakuru Division", "Tiptur Division", "Madhugiri Division"],
  "Dakshina Kannada": ["Mangaluru Division", "Bantwal Division", "Puttur Division"],

  "Ernakulam": ["Kochi Division", "Aluva Division", "Muvattupuzha Division"],
  "Thiruvananthapuram": ["Trivandrum City Division", "Attingal Division", "Neyyattinkara Division"],

  "Visakhapatnam": ["Vizag City Division", "Anakapalle Division"],
  "Vijayawada": ["Vijayawada Urban Division", "Gudivada Division"],
  "Hyderabad": ["Hyderabad Central Division", "Secunderabad Division", "Charminar Division", "Cyberabad Division"],

  "Mumbai City": ["South Mumbai Division", "Central Mumbai Division"],
  "Mumbai Suburban": ["Western Suburbs Division", "Eastern Suburbs Division", "Andheri Division", "Borivali Division"],
  "Pune": ["Pune City Division", "Pimpri-Chinchwad Division", "Baramati Division"],

  "New Delhi": ["Connaught Place Division", "Chanakyapuri Division"],
  "Gurugram / NCR": ["DLF Cyber City Division", "Gurugram South Division"]
};

const PINCODE_DIRECTORY: Record<string, { state: string, division: string, district: string, postOffice: string }> = {
  "560001": { state: "Karnataka", division: "Bengaluru Division", district: "Bengaluru Urban", postOffice: "Bengaluru G.P.O." },
  "560037": { state: "Karnataka", division: "Bengaluru Division", district: "Bengaluru Urban", postOffice: "Marathahalli" },
  "572101": { state: "Karnataka", division: "Bengaluru Division", district: "Tumakuru", postOffice: "Tumkur Head Office" },
  "570001": { state: "Karnataka", division: "Mysuru Division", district: "Mysuru", postOffice: "Mysuru Head Office" },
  "635109": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", postOffice: "Hosur Head Office" },
  "635206": { state: "Tamil Nadu", division: "Dharmapuri Division", district: "Krishnagiri", postOffice: "Singarapettai Post Office" }
};

const ROLE_SAMPLES = {
  state: {
    name: 'Suresh Kumar',
    phone: '9876543210',
    email: 'suresh.kumar@example.com',
    aadhar: '1234 5678 9012',
    pan: 'ABCDE1234F',
    state: 'Karnataka',
    division: 'Bengaluru Division',
    district: 'Bengaluru Urban',
    pincode: '560001'
  },
  division: {
    name: 'Priya Sharma',
    phone: '9123456780',
    email: 'priya.sharma@example.com',
    aadhar: '2345 6789 0123',
    pan: 'PQRST5678L',
    state: 'Karnataka',
    division: 'Mysuru Division',
    district: 'Mysuru',
    pincode: '570001'
  },
  district: {
    name: 'Arun Prakash',
    phone: '9012345678',
    email: 'arun.prakash@example.com',
    aadhar: '3456 7890 1234',
    pan: 'LMNOP6789K',
    state: 'Karnataka',
    division: 'Bengaluru Division',
    district: 'Tumakuru',
    pincode: '572101'
  },
  pincode: {
    name: 'Karthik R',
    phone: '9988776655',
    email: 'karthik.r@example.com',
    aadhar: '4567 8901 2345',
    pan: 'UVWXY9876P',
    state: 'Karnataka',
    division: 'Bengaluru Division',
    district: 'Bengaluru Urban',
    pincode: '560037'
  }
};

const REGISTRATION_DRAFT_KEY = 'agent_registration_draft';

const getInitialDraft = () => {
  try {
    const saved = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading registration draft:', e);
  }
  return null;
};

export const RegisterWizard: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const initialDraft = useMemo(() => getInitialDraft(), []);

  // Wizard state control
  const [currentStep, setCurrentStep] = useState<number>(initialDraft?.currentStep || 1);
  const totalSteps = 4;
  const [formErrors, setFormErrors] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [role, setRole] = useState<'state' | 'division' | 'district' | 'pincode'>(initialDraft?.role || 'state');
  const [personalInfo, setPersonalInfo] = useState(initialDraft?.personalInfo || {
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

  const [address, setAddress] = useState(initialDraft?.address || {
    state: '',
    division: '',
    district: '',
    pincode: '',
    postOffice: '',
    fullAddress: ''
  });

  const handlePincodeChange = (pin: string) => {
    const cleaned = pin.replace(/\D/g, '').slice(0, 6);
    
    let updatedAddress = {
      ...address,
      pincode: cleaned,
    };

    if (cleaned.length === 6) {
      const match = PINCODE_DIRECTORY[cleaned];
      if (match) {
        if (!address.state) updatedAddress.state = match.state;
        if (!address.district) updatedAddress.district = match.district;
        if (!address.division) updatedAddress.division = match.division;
        updatedAddress.postOffice = match.postOffice;
      } else {
        updatedAddress.postOffice = `Post Office Sec-${cleaned.slice(-3)}`;
      }
    } else {
      updatedAddress.postOffice = '';
    }
    
    setAddress(updatedAddress);
  };

  const [professionalInfo, setProfessionalInfo] = useState(initialDraft?.professionalInfo || {
    qualification: '',
    experience: 'fresher',
    previousCompany: ''
  });

  const [documents, setDocuments] = useState<Record<string, { fileName: string; dataUrl: string; size: number }>>(initialDraft?.documents || {
    aadhaarCard: { fileName: '', dataUrl: '', size: 0 },
    panCard: { fileName: '', dataUrl: '', size: 0 },
    passportPhoto: { fileName: '', dataUrl: '', size: 0 },
    signature: { fileName: '', dataUrl: '', size: 0 },
    educationalCertificate: { fileName: '', dataUrl: '', size: 0 },
    bankProof: { fileName: '', dataUrl: '', size: 0 }
  });

  const [declaration, setDeclaration] = useState(initialDraft?.declaration || {
    infoCorrect: false,
    acceptTerms: false,
    understandApproval: false
  });

  // Save form draft to sessionStorage automatically on state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(
        REGISTRATION_DRAFT_KEY,
        JSON.stringify({
          currentStep,
          role,
          personalInfo,
          address,
          professionalInfo,
          documents,
          declaration
        })
      );
    } catch (e) {
      console.error('Error saving registration draft:', e);
    }
  }, [currentStep, role, personalInfo, address, professionalInfo, documents, declaration]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } catch (e) { }
    setCurrentStep(1);
    setRole('state');
    setPersonalInfo({ name: '', phone: '', altPhone: '', email: '', password: '', confirmPassword: '', dob: '', gender: 'male', aadhaarNumber: '', panNumber: '' });
    setAddress({ state: '', division: '', district: '', pincode: '', postOffice: '', fullAddress: '' });
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
  };

  // Success screen state
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    role: string;
    status: string;
  } | null>(null);

  // Dynamic placeholders based on selected role
  const sample = ROLE_SAMPLES[role];

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
      if (!personalInfo.dob) {
        setFormErrors('Please select your Date of Birth.');
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
      if (!address.state) {
        setFormErrors('Please select your assigned State.');
        return;
      }
      if (role !== 'state' && !address.district) {
        setFormErrors('Please select your assigned District.');
        return;
      }
      if ((role === 'division' || role === 'pincode') && !address.division) {
        setFormErrors('Please select your assigned Division.');
        return;
      }
      if (role === 'pincode' && !address.pincode) {
        setFormErrors('Please enter your assigned 6-digit Pincode.');
        return;
      }
      if (!address.fullAddress) {
        setFormErrors('Please enter your full street/building address.');
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
      const payload = {
        name: personalInfo.name,
        email: personalInfo.email,
        password: personalInfo.password,
        phone: personalInfo.phone,
        role: role,
        dob: personalInfo.dob,
        gender: personalInfo.gender,
        qualification: professionalInfo.qualification,
        experience: professionalInfo.experience,
        previousCompany: professionalInfo.previousCompany,
        territory: {
          state: address.state,
          district: role === 'state' ? '' : address.district,
          division: (role === 'state' || role === 'district') ? '' : address.division,
          pincode: role === 'pincode' ? address.pincode : ''
        },
        kycDocs: {
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
                  className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors bg-slate-100 hover:bg-red-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-200"
                  title="Clear saved draft and start fresh"
                >
                  Clear Draft
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
                    setAddress(prev => ({
                      state: prev.state,
                      district: newRole === 'state' ? '' : prev.district,
                      division: (newRole === 'state' || newRole === 'district') ? '' : prev.division,
                      pincode: newRole === 'pincode' ? prev.pincode : '',
                      postOffice: newRole === 'pincode' ? prev.postOffice : '',
                      fullAddress: prev.fullAddress
                    }));
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Full Name (Required)"
                      placeholder={`e.g. ${sample.name}`}
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Input
                      label="Primary Mobile Number (Required)"
                      maxLength={10}
                      placeholder={`e.g. ${sample.phone}`}
                      value={personalInfo.phone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 0 && !/^[6-9]/.test(val)) val = '';
                        if (val.length > 10) val = val.slice(0, 10);
                        setPersonalInfo({ ...personalInfo, phone: val });
                      }}
                    />
                    {personalInfo.phone.length > 0 && personalInfo.phone.length < 10 && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.</p>
                    )}
                    {personalInfo.phone.length === 10 && !/^[6-9][0-9]{9}$/.test(personalInfo.phone) && (
                      <p className="text-[10px] text-red-500 font-bold mt-1">Mobile number must start with 6, 7, 8, or 9.</p>
                    )}
                  </div>

                  <Input
                    label="Email Address (Required)"
                    type="email"
                    placeholder={`e.g. ${sample.email}`}
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
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

                  <Select
                    label="Gender"
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ]}
                    value={personalInfo.gender}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Profile Photo, Verification & Address Details */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-800">Verification & Address Details</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Provide your profile photo, alternative contact, ID verification numbers, and address.
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
                  <Input
                    label="• Date of Birth (Required)"
                    type="date"
                    value={personalInfo.dob}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
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

                {/* 6. Address & Territory Details */}
                <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-3 mt-2">
                  <div className="text-xs font-black text-[#864f19] uppercase tracking-wider">
                    • Address & Territory Details ({role.toUpperCase()} AGENT)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      label="State (Required)"
                      options={[
                        { value: '', label: '-- Select Assigned State --' },
                        ...ALL_INDIAN_STATES.map(s => ({ value: s, label: s }))
                      ]}
                      value={address.state}
                      onChange={(e) => {
                        const selState = e.target.value;
                        setAddress({
                          ...address,
                          state: selState,
                          district: '',
                          division: '',
                          pincode: '',
                          postOffice: ''
                        });
                        setFormErrors('');
                      }}
                    />

                    {role !== 'state' && (
                      <Select
                        label="District (Required)"
                        disabled={!address.state}
                        options={[
                          { value: '', label: address.state ? '-- Select Assigned District --' : 'Select State First' },
                          ...(STATE_DISTRICTS[address.state] || ["District Main", "District North", "District South", "District East", "District West"]).map(d => ({ value: d, label: d }))
                        ]}
                        value={address.district}
                        onChange={(e) => {
                          const selDistrict = e.target.value;
                          setAddress({
                            ...address,
                            district: selDistrict,
                            division: '',
                            pincode: '',
                            postOffice: ''
                          });
                          setFormErrors('');
                        }}
                      />
                    )}

                    {(role === 'division' || role === 'pincode') && (
                      <Select
                        label="Division (Required)"
                        disabled={!address.district}
                        options={[
                          { value: '', label: address.district ? '-- Select Assigned Division --' : 'Select District First' },
                          ...(DISTRICT_DIVISIONS[address.district] || [
                            `${address.district} Central Division`,
                            `${address.district} North Division`,
                            `${address.district} South Division`,
                            `${address.district} East Division`,
                            `${address.district} West Division`
                          ]).map(div => ({ value: div, label: div }))
                        ]}
                        value={address.division}
                        onChange={(e) => {
                          const selDiv = e.target.value;
                          setAddress({
                            ...address,
                            division: selDiv,
                            pincode: '',
                            postOffice: ''
                          });
                          setFormErrors('');
                        }}
                      />
                    )}

                    {role === 'pincode' && (
                      <>
                        <Input
                          label="Pincode (6 Digits)"
                          maxLength={6}
                          placeholder="Enter 6-digit Pincode (e.g. 635109)"
                          value={address.pincode}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                        />

                        {address.postOffice && (
                          <Input
                            label="Post Office Branch"
                            value={address.postOffice}
                            disabled
                            className="bg-slate-50 cursor-not-allowed opacity-80"
                            placeholder="Auto-populated"
                          />
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-3">
                    <Input
                      label="Full Street Address (Required)"
                      placeholder="Street name, landmark, building number"
                      value={address.fullAddress}
                      onChange={(e) => setAddress({ ...address, fullAddress: e.target.value })}
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
                  ].map((doc) => (
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
                          {documents[doc.key].fileName ? 'Change File' : 'Select File'}
                        </button>
                        {documents[doc.key].fileName && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-600 font-bold truncate max-w-[130px]" title={documents[doc.key].fileName}>
                              ✓ {documents[doc.key].fileName}
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
                  ))}
                </div>

                {/* Signature Pad */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <SignaturePad
                    onSave={(data) => setDocuments(prev => ({
                      ...prev,
                      signature: { fileName: 'digital_signature.png', dataUrl: data, size: data.length }
                    }))}
                    onClear={() => setDocuments(prev => ({
                      ...prev,
                      signature: { fileName: '', dataUrl: '', size: 0 }
                    }))}
                  />
                  {documents.signature.fileName && (
                    <span className="text-[10px] text-emerald-600 font-bold block mt-2">
                      ✓ Signature confirmed
                    </span>
                  )}
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
