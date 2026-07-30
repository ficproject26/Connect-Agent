import React, { useState } from 'react';
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

const GEOGRAPHY_DATA: Record<string, Record<string, Record<string, string[]>>> = {
  "Karnataka": {
    "Bengaluru Division": {
      "Bengaluru Urban": ["560001", "560037"],
      "Tumakuru": ["572101"]
    },
    "Mysuru Division": {
      "Mysuru": ["570001"]
    }
  }
};

const PINCODE_DIRECTORY: Record<string, { state: string, division: string, district: string, postOffice: string }> = {
  "560001": { state: "Karnataka", division: "Bengaluru Division", district: "Bengaluru Urban", postOffice: "Bengaluru G.P.O." },
  "560037": { state: "Karnataka", division: "Bengaluru Division", district: "Bengaluru Urban", postOffice: "Marathahalli" },
  "572101": { state: "Karnataka", division: "Bengaluru Division", district: "Tumakuru", postOffice: "Tumkur Head Office" },
  "570001": { state: "Karnataka", division: "Mysuru Division", district: "Mysuru", postOffice: "Mysuru Head Office" },
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

export const RegisterWizard: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Wizard state control
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [formErrors, setFormErrors] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [role, setRole] = useState<'state' | 'division' | 'district' | 'pincode'>('state');
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    dob: '',
    gender: 'male'
  });

  const [address, setAddress] = useState({
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
      state: '',
      division: '',
      district: '',
      postOffice: ''
    };

    if (cleaned.length === 6) {
      const match = PINCODE_DIRECTORY[cleaned];
      if (match) {
        updatedAddress.state = match.state;
        updatedAddress.division = match.division;
        updatedAddress.district = match.district;
        updatedAddress.postOffice = match.postOffice;
      } else {
        // Resolve Indian State by Pincode Prefix
        const firstDigit = cleaned.charAt(0);
        const prefixTwo = parseInt(cleaned.slice(0, 2), 10);
        
        let state = "Karnataka";
        let division = "Bengaluru Division";
        let district = "Bengaluru Urban";
        let postOffice = `Post Office Sector-${cleaned.slice(-3)}`;

        if (firstDigit === '1') {
          if (prefixTwo === 11) {
            state = "Delhi";
            division = "Delhi Division";
            district = "New Delhi";
          } else if (prefixTwo >= 12 && prefixTwo <= 13) {
            state = "Haryana";
            division = "Gurugram Division";
            district = "Gurugram";
          } else if (prefixTwo >= 14 && prefixTwo <= 16) {
            state = "Punjab";
            division = "Jalandhar Division";
            district = "Amritsar";
          } else if (prefixTwo === 17) {
            state = "Himachal Pradesh";
            division = "Shimla Division";
            district = "Shimla";
          } else {
            state = "Jammu & Kashmir";
            division = "Srinagar Division";
            district = "Srinagar";
          }
        } else if (firstDigit === '2') {
          if (prefixTwo >= 20 && prefixTwo <= 28) {
            state = "Uttar Pradesh";
            division = "Lucknow Division";
            district = "Lucknow";
          } else {
            state = "Uttarakhand";
            division = "Dehradun Division";
            district = "Dehradun";
          }
        } else if (firstDigit === '3') {
          if (prefixTwo >= 30 && prefixTwo <= 34) {
            state = "Rajasthan";
            division = "Jaipur Division";
            district = "Jaipur";
          } else {
            state = "Gujarat";
            division = "Ahmedabad Division";
            district = "Ahmedabad";
          }
        } else if (firstDigit === '4') {
          if (prefixTwo >= 45 && prefixTwo <= 48) {
            state = "Madhya Pradesh";
            division = "Bhopal Division";
            district = "Bhopal";
          } else if (prefixTwo === 49) {
            state = "Chhattisgarh";
            division = "Raipur Division";
            district = "Raipur";
          } else {
            state = "Maharashtra";
            division = "Konkan Division";
            district = "Mumbai";
          }
        } else if (firstDigit === '5') {
          if (prefixTwo >= 56 && prefixTwo <= 59) {
            state = "Karnataka";
            division = "Bengaluru Division";
            district = "Bengaluru Urban";
          } else if (prefixTwo >= 50 && prefixTwo <= 53) {
            state = "Andhra Pradesh";
            division = "Vijayawada Division";
            district = "Vijayawada";
          } else {
            state = "Telangana";
            division = "Hyderabad Division";
            district = "Hyderabad";
          }
        } else if (firstDigit === '6') {
          if (prefixTwo >= 67 && prefixTwo <= 69) {
            state = "Kerala";
            division = "Kochi Division";
            district = "Ernakulam";
          } else {
            state = "Tamil Nadu";
            const prefixThree = parseInt(cleaned.slice(0, 3), 10);
            
            if (prefixThree === 600) {
              division = "Chennai Division";
              district = "Chennai";
              postOffice = `Chennai G.P.O. Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 601 && prefixThree <= 603) {
              division = "Chennai Division";
              district = "Kanchipuram";
              postOffice = `Kanchipuram Branch Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 605 && prefixThree <= 608) {
              division = "Trichy Division";
              district = "Cuddalore";
              postOffice = `Cuddalore Branch Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 609 && prefixThree <= 614) {
              division = "Trichy Division";
              district = "Thanjavur";
              postOffice = `Thanjavur Branch Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 620 && prefixThree <= 622) {
              division = "Trichy Division";
              district = "Tiruchirappalli";
              postOffice = `Tiruchirappalli H.O. Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 623 && prefixThree <= 625) {
              division = "Madurai Division";
              district = "Madurai";
              postOffice = `Madurai H.O. Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 626 && prefixThree <= 628) {
              division = "Madurai Division";
              district = "Tirunelveli";
              postOffice = `Tirunelveli Branch Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 630 && prefixThree <= 632) {
              division = "Vellore Division";
              district = "Vellore";
              postOffice = `Vellore Head Office Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree === 635) {
              division = "Dharmapuri Division";
              district = "Krishnagiri";
              postOffice = `Krishnagiri Branch Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 636 && prefixThree <= 637) {
              division = "Salem Division";
              district = "Salem";
              postOffice = `Salem H.O. Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 638 && prefixThree <= 640) {
              division = "Coimbatore Division";
              district = "Coimbatore";
              postOffice = `Coimbatore H.O. Sec-${cleaned.slice(-3)}`;
            } else if (prefixThree >= 641 && prefixThree <= 643) {
              division = "Coimbatore Division";
              district = "Erode";
              postOffice = `Erode Branch Sec-${cleaned.slice(-3)}`;
            } else {
              division = "Chennai Division";
              district = "Tamil Nadu District";
              postOffice = `Tamil Nadu Branch Sec-${cleaned.slice(-3)}`;
            }
          }
        } else if (firstDigit === '7') {
          if (prefixTwo >= 70 && prefixTwo <= 74) {
            state = "West Bengal";
            division = "Kolkata Division";
            district = "Kolkata";
          } else if (prefixTwo >= 75 && prefixTwo <= 77) {
            state = "Odisha";
            division = "Bhubaneswar Division";
            district = "Khordha";
          } else if (prefixTwo === 78) {
            state = "Assam";
            division = "Guwahati Division";
            district = "Kamrup";
          } else {
            state = "Meghalaya";
            division = "Shillong Division";
            district = "East Khasi Hills";
          }
        } else if (firstDigit === '8') {
          if (prefixTwo >= 80 && prefixTwo <= 83) {
            state = "Bihar";
            division = "Patna Division";
            district = "Patna";
          } else {
            state = "Jharkhand";
            division = "Ranchi Division";
            district = "Ranchi";
          }
        } else if (firstDigit === '9') {
          state = "Army Post Office";
          division = "APS Division";
          district = "Central Base Post Office";
        }

        updatedAddress.state = state;
        updatedAddress.division = division;
        updatedAddress.district = district;
        updatedAddress.postOffice = postOffice;
      }
    }
    
    setAddress(updatedAddress);
  };

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

  // Success screen state
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    role: string;
    status: string;
  } | null>(null);

  // Dynamic placeholders based on selected role
  const sample = ROLE_SAMPLES[role];

  // Geography selectors helper
  const stateOptions = Object.keys(GEOGRAPHY_DATA).map(s => ({ value: s, label: s }));
  const divisionOptions = address.state && GEOGRAPHY_DATA[address.state]
    ? Object.keys(GEOGRAPHY_DATA[address.state]).map(div => ({ value: div, label: div }))
    : [];
  const districtOptions = address.state && address.division && GEOGRAPHY_DATA[address.state]?.[address.division]
    ? Object.keys(GEOGRAPHY_DATA[address.state][address.division]).map(dist => ({ value: dist, label: dist }))
    : [];
  const pincodeOptions = address.state && address.division && address.district && GEOGRAPHY_DATA[address.state]?.[address.division]?.[address.district]
    ? GEOGRAPHY_DATA[address.state][address.division][address.district].map(pin => ({ value: pin, label: pin }))
    : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
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

    const reader = new FileReader();
    reader.onload = () => {
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          fileName: file.name,
          dataUrl: reader.result as string,
          size: file.size
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const nextStep = () => {
    setFormErrors('');

    if (currentStep === 1) {
      if (!personalInfo.name || !personalInfo.phone || !personalInfo.email || !personalInfo.password || !personalInfo.confirmPassword || !personalInfo.dob) {
        setFormErrors('All personal information fields are required.');
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
      if (!/^\d{10}$/.test(personalInfo.phone)) {
        setFormErrors('Phone number must be exactly 10 digits.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!address.state || !address.division || !address.district || !address.pincode || !address.fullAddress) {
        setFormErrors('All address fields are required.');
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
          division: address.division,
          district: address.district,
          pincode: address.pincode
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
        setSuccessData({
          registrationId: response.registrationId,
          role: response.role,
          status: response.status
        });
      } else {
        setFormErrors('Registration completed, but no ID was returned.');
      }
    } catch (err: any) {
      setFormErrors(err.response?.data?.message || 'Registration failed. Duplicate email or phone.');
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
          <Card className="glass-card-auth p-8 bg-white border border-slate-200/80 rounded-3xl shadow-2xl space-y-6">
            <div className="inline-flex p-4 bg-emerald-50 text-emerald-500 rounded-full animate-bounce">
              <CheckCircle className="w-16 h-16" />
            </div>

            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registration Submitted Successfully!</h2>
            
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
              <span className="text-xs font-black text-[#864f19] uppercase tracking-wider">
                Agent Onboarding Portal
              </span>
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
            
            {/* STEP 1: Personal Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-800">Role & Personal Information</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Select the agent role and configure your credentials.</p>
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
                    setRole(e.target.value as any);
                    setFormErrors('');
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Full Name"
                      placeholder={`e.g. ${sample.name}`}
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                    />
                  </div>

                  <Input
                    label="Phone Number"
                    maxLength={10}
                    placeholder={`e.g. ${sample.phone}`}
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder={`e.g. ${sample.email}`}
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                  />

                  <Input
                    label="Password"
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

                  <Input
                    label="Confirm Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={personalInfo.confirmPassword}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, confirmPassword: e.target.value })}
                  />

                  <Input
                    label="Date of Birth"
                    type="date"
                    value={personalInfo.dob}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
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

            {/* STEP 2: Address Information (Automatic Pincode Lookup) */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="font-extrabold text-lg text-slate-800">Territory & Address Details</h3>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Enter your 6-digit Pincode to automatically populate State, Division, District, and Post Office details.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Pincode"
                      maxLength={6}
                      placeholder="Enter 6-digit Pincode (e.g. 560001)"
                      value={address.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                    />
                  </div>

                  <Input
                    label="State"
                    value={address.state}
                    disabled
                    className="bg-slate-50 cursor-not-allowed opacity-80"
                    placeholder="Auto-populated"
                  />

                  <Input
                    label="Division"
                    value={address.division}
                    disabled
                    className="bg-slate-50 cursor-not-allowed opacity-80"
                    placeholder="Auto-populated"
                  />

                  <Input
                    label="District"
                    value={address.district}
                    disabled
                    className="bg-slate-50 cursor-not-allowed opacity-80"
                    placeholder="Auto-populated"
                  />

                  <Input
                    label="Post Office Branch"
                    value={address.postOffice}
                    disabled
                    className="bg-slate-50 cursor-not-allowed opacity-80"
                    placeholder="Auto-populated"
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Full Address"
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
                  <Input
                    label="Highest Qualification"
                    placeholder="e.g. Bachelor of Commerce / MBA / High School"
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
                          <span className="text-[10px] text-emerald-600 font-bold truncate max-w-[150px]">
                            ✓ {documents[doc.key].fileName}
                          </span>
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
                    I declare that all the information provided in this registration form is correct and true.
                  </label>

                  <label className="flex items-start text-xs font-bold text-slate-700 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={declaration.acceptTerms}
                      onChange={(e) => setDeclaration({ ...declaration, acceptTerms: e.target.checked })}
                      className="mr-2.5 mt-0.5 rounded text-[#864f19] focus:ring-[#864f19] h-4 w-4 border-slate-300"
                    />
                    I accept the terms & conditions of Forge Connect Agent App.
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
