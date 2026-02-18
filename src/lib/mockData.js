export const mockLabourers = [
    { id: '1', name: 'Ramesh Kumar', nameHindi: 'रमेश कुमार', phone: '+91 98765 43210', role: 'Mason', dailyRate: 800, status: 'active', location: 'Site A - Sector 15', joinDate: '2024-01-15' },
    { id: '2', name: 'Suresh Yadav', nameHindi: 'सुरेश यादव', phone: '+91 98765 43211', role: 'Helper', dailyRate: 500, status: 'active', location: 'Site A - Sector 15', joinDate: '2024-02-20' },
    { id: '3', name: 'Mohan Singh', nameHindi: 'मोहन सिंह', phone: '+91 98765 43212', role: 'Painter', dailyRate: 700, status: 'active', location: 'Site B - Sector 22', joinDate: '2024-01-10' },
    { id: '4', name: 'Anil Sharma', nameHindi: 'अनिल शर्मा', phone: '+91 98765 43213', role: 'Electrician', dailyRate: 900, status: 'active', location: 'Site B - Sector 22', joinDate: '2023-11-05' },
    { id: '5', name: 'Prakash Verma', nameHindi: 'प्रकाश वर्मा', phone: '+91 98765 43214', role: 'Plumber', dailyRate: 850, status: 'active', location: 'Site C - Sector 18', joinDate: '2024-03-01' },
    { id: '6', name: 'Dinesh Gupta', nameHindi: 'दिनेश गुप्ता', phone: '+91 98765 43215', role: 'Carpenter', dailyRate: 750, status: 'inactive', location: 'Site A - Sector 15', joinDate: '2023-09-15' },
    { id: '7', name: 'Vijay Patel', nameHindi: 'विजय पटेल', phone: '+91 98765 43216', role: 'Mason', dailyRate: 800, status: 'active', location: 'Site C - Sector 18', joinDate: '2024-02-10' },
    { id: '8', name: 'Santosh Kumar', nameHindi: 'संतोष कुमार', phone: '+91 98765 43217', role: 'Helper', dailyRate: 450, status: 'active', location: 'Site A - Sector 15', joinDate: '2024-04-01' },
];

export const mockWorkEntries = [
    { id: '1', labourId: '1', labourName: 'Ramesh Kumar', date: '2024-12-12', taskType: 'Brick Laying', meters: 45, amount: 4500, location: 'Site A - Block 3', description: 'Foundation wall brick work', status: 'approved' },
    { id: '2', labourId: '2', labourName: 'Suresh Yadav', date: '2024-12-12', taskType: 'Material Transport', hours: 8, amount: 500, location: 'Site A - Block 3', description: 'Carried bricks and cement', status: 'pending' },
    { id: '3', labourId: '3', labourName: 'Mohan Singh', date: '2024-12-11', taskType: 'Wall Painting', meters: 120, amount: 3600, location: 'Site B - Unit 5', description: 'Interior wall painting - primer coat', status: 'approved' },
    { id: '4', labourId: '4', labourName: 'Anil Sharma', date: '2024-12-11', taskType: 'Wiring', meters: 85, amount: 4250, location: 'Site B - Unit 5', description: 'Electrical conduit installation', status: 'flagged', flagReason: 'Unusually high meters reported' },
    { id: '5', labourId: '5', labourName: 'Prakash Verma', date: '2024-12-10', taskType: 'Pipe Fitting', meters: 30, amount: 2550, location: 'Site C - Building 2', description: 'PVC pipe installation for drainage', status: 'approved' },
    { id: '6', labourId: '7', labourName: 'Vijay Patel', date: '2024-12-10', taskType: 'Brick Laying', meters: 38, amount: 3800, location: 'Site C - Building 2', description: 'Partition wall construction', status: 'pending' },
];

export const mockPayments = [
    { id: '1', labourId: '1', labourName: 'Ramesh Kumar', amount: 12000, method: 'upi', date: '2024-12-08', status: 'paid', workEntryIds: ['1'] },
    { id: '2', labourId: '3', labourName: 'Mohan Singh', amount: 8500, method: 'cash', date: '2024-12-08', status: 'paid', workEntryIds: ['3'] },
    { id: '3', labourId: '2', labourName: 'Suresh Yadav', amount: 3500, method: 'bank', date: '2024-12-10', status: 'unpaid', workEntryIds: ['2'] },
    { id: '4', labourId: '5', labourName: 'Prakash Verma', amount: 6800, method: 'upi', date: '2024-12-09', status: 'paid', workEntryIds: ['5'] },
];

export const mockActivities = [
    { id: '1', type: 'work', message: 'Ramesh Kumar completed 45m brick work', messageHindi: 'रमेश कुमार ने 45m ईंट का काम पूरा किया', timestamp: '2024-12-12T14:30:00', icon: '🧱' },
    { id: '2', type: 'payment', message: 'Payment of ₹12,000 made to Ramesh Kumar', messageHindi: 'रमेश कुमार को ₹12,000 का भुगतान किया गया', timestamp: '2024-12-12T12:00:00', icon: '💰' },
    { id: '3', type: 'flag', message: 'Suspicious entry flagged for Anil Sharma', messageHindi: 'अनिल शर्मा के लिए संदिग्ध प्रविष्टि चिह्नित', timestamp: '2024-12-11T16:45:00', icon: '⚠️' },
    { id: '4', type: 'labour', message: 'Santosh Kumar added to the team', messageHindi: 'संतोष कुमार को टीम में जोड़ा गया', timestamp: '2024-12-11T09:00:00', icon: '👤' },
    { id: '5', type: 'work', message: 'Mohan Singh completed painting 120m', messageHindi: 'मोहन सिंह ने 120m पेंटिंग पूरी की', timestamp: '2024-12-11T17:00:00', icon: '🎨' },
];

export const dashboardStats = {
    totalLabourers: 8,
    activeLabourers: 7,
    todayAttendance: 6,
    pendingPayments: 2,
    pendingAmount: 10300,
    flaggedEntries: 1,
    totalMetersToday: 83,
    totalHoursToday: 8,
};

export const taskTypes = [
    'Brick Laying',
    'Wall Painting',
    'Wiring',
    'Pipe Fitting',
    'Material Transport',
    'Carpentry',
    'Plastering',
    'Flooring',
    'Roofing',
    'Other',
];

export const locations = [
    'Site A - Sector 15',
    'Site B - Sector 22',
    'Site C - Sector 18',
];
