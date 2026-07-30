export interface ReportItem {
  title: string;
  desc: string;
  category?: string;
}

export const downloadReport = (title: string, userRole: string = 'agent', userData: any = {}) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleTimeString();

  let csvContent = '';
  
  if (title.toLowerCase().includes('daily')) {
    csvContent = [
      `"Report Title","${title}"`,
      `"Generated At","${dateStr} ${timeStr}"`,
      `"User Role","${userRole.toUpperCase()}"`,
      `"User ID","${userData?._id || userData?.id || 'AG-AGENT-001'}"`,
      `"Name","${userData?.name || 'Agent User'}"`,
      '',
      '"Metric / Task","Status","Target Count","Completed Count","Verification Log","Timestamp"',
      `"Active Visits & Field Verifications","Completed",15,14,"Verified via GeoTag & Documents","${dateStr}"`,
      `"Merchant Document Verification Checklist","Completed",20,20,"Aadhaar & GST Verified","${dateStr}"`,
      `"New Onboarding Approvals","In Progress",5,3,"2 Pending Review","${dateStr}"`,
      `"Issue Resolution & Queries","Resolved",8,8,"All tickets closed","${dateStr}"`
    ].join('\n');
  } else if (title.toLowerCase().includes('weekly')) {
    csvContent = [
      `"Report Title","${title}"`,
      `"Generated At","${dateStr} ${timeStr}"`,
      `"User Role","${userRole.toUpperCase()}"`,
      `"User ID","${userData?._id || userData?.id || 'AG-AGENT-001'}"`,
      `"Name","${userData?.name || 'Agent User'}"`,
      '',
      '"Day","Visits Completed","Verifications Done","Targets Achieved","Weekly Score (%)"',
      `"Monday",12,10,10,95`,
      `"Tuesday",14,12,12,98`,
      `"Wednesday",15,15,14,96`,
      `"Thursday",10,10,10,92`,
      `"Friday",16,14,14,97`,
      `"Saturday",8,8,8,100`,
      `"Sunday",0,0,0,0`,
      `"Total Weekly Summary",75,69,68,96.3`
    ].join('\n');
  } else if (title.toLowerCase().includes('monthly') || title.toLowerCase().includes('state') || title.toLowerCase().includes('division')) {
    csvContent = [
      `"Report Title","${title}"`,
      `"Generated At","${dateStr} ${timeStr}"`,
      `"User Role","${userRole.toUpperCase()}"`,
      `"User ID","${userData?._id || userData?.id || 'AG-AGENT-001'}"`,
      `"Name","${userData?.name || 'Agent User'}"`,
      '',
      '"Category / Metric","Target","Achieved","Efficiency (%)","Status"',
      `"Merchant Acquisition & Onboarding",200,186,93.0,"On Track"`,
      `"Agent Field Activity & Compliance",100,98,98.0,"High Performance"`,
      `"Document & KYC Audits",250,245,98.0,"Approved"`,
      `"Target Completion Metrics Summaries",50,47,94.0,"Met Criteria"`
    ].join('\n');
  } else {
    csvContent = [
      `"Report Title","${title}"`,
      `"Generated At","${dateStr} ${timeStr}"`,
      `"User Role","${userRole.toUpperCase()}"`,
      `"User ID","${userData?._id || userData?.id || 'AG-AGENT-001'}"`,
      `"Name","${userData?.name || 'Agent User'}"`,
      '',
      '"Log ID","Activity Name","Department / Sector","Result Status","Audit Timestamp"',
      `"LOG-${Math.floor(100000 + Math.random() * 900000)}","${title} Inspection","Field Ops","Success","${dateStr} ${timeStr}"`,
      `"LOG-${Math.floor(100000 + Math.random() * 900000)}","Verification Sync","Compliance","Success","${dateStr} ${timeStr}"`,
      `"LOG-${Math.floor(100000 + Math.random() * 900000)}","Summary Analytics Audit","Management","Verified","${dateStr} ${timeStr}"`
    ].join('\n');
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${dateStr}.csv`;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
