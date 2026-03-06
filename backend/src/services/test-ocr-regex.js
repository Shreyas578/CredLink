const { parsePaymentFields } = require("./ocr.service");

const testCases = [
    {
        name: "Standard UPI",
        text: "Paid to: Akash Somsetwar\nAmount: ₹1250\nTransaction ID: UPI260302095407\nDate: 02 Mar 2026",
        expected: { amount: 1250, merchant: "Akash Somsetwar", transactionId: "UPI260302095407" }
    },
    {
        name: "User Reported Case (Amount —)",
        text: "Merchant: Akash Somsetwar\nAmount —\nTransaction ID: T2603020954073438371956\nDate: 02 Mar 2026",
        expected: { merchant: "Akash Somsetwar", transactionId: "T2603020954073438371956" }
    },
    {
        name: "Case with hyphen in Amount",
        text: "Merchant: Test\nAmount - 500\nTransaction ID: TX-123",
        expected: { amount: 500, merchant: "Test", transactionId: "TX-123" }
    },
    {
        name: "Case with em-dash in Amount",
        text: "Merchant: Test\nAmount — 750.50\nTransaction ID: TX-456",
        expected: { amount: 750.5, merchant: "Test", transactionId: "TX-456" }
    }
];

testCases.forEach(tc => {
    const result = parsePaymentFields(tc.text);
    console.log(`Test Case: ${tc.name}`);
    console.log(`Result: ${JSON.stringify(result, null, 2)}`);
    console.log('-------------------');
});
