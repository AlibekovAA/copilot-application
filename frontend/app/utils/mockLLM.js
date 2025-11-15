const responses = {
  business: [
    "Based on market analysis and industry trends, I would recommend focusing on customer retention strategies. Research shows that increasing customer retention by 5% can increase profits by 25-95%. Consider implementing a loyalty program, personalized communication channels, and regular feedback mechanisms.",
    "From a strategic perspective, this presents both opportunities and challenges. The key is to align your business objectives with market demands while maintaining operational efficiency. I suggest conducting a SWOT analysis to identify your competitive advantages and potential risks.",
    "Looking at the financial implications, you should consider both short-term and long-term ROI. While initial investments might be substantial, the projected returns over 3-5 years show promising growth potential. I recommend phased implementation to manage cash flow effectively.",
  ],
  technical: [
    "From a technical standpoint, I'd recommend implementing a microservices architecture for scalability. This approach allows independent deployment of services, better fault isolation, and easier maintenance. Consider using containerization with Docker and orchestration with Kubernetes for optimal resource management.",
    "The technical solution should prioritize security, performance, and maintainability. I suggest implementing OAuth 2.0 for authentication, using HTTPS for all communications, and following OWASP security guidelines. Additionally, implement comprehensive logging and monitoring for early issue detection.",
    "For this implementation, I'd recommend using a cloud-native approach with auto-scaling capabilities. This ensures your infrastructure can handle variable loads efficiently. Consider AWS, Azure, or Google Cloud Platform based on your specific requirements and existing tech stack.",
  ],
  marketing: [
    "From a marketing perspective, understanding your target audience is crucial. I recommend developing detailed buyer personas and mapping out customer journeys. This will help you create more targeted campaigns with higher conversion rates. Consider A/B testing different messaging strategies to optimize performance.",
    "Digital marketing trends indicate that omnichannel presence is essential. Your strategy should integrate social media, content marketing, email campaigns, and SEO. Focus on creating valuable content that addresses customer pain points. Metrics to track include engagement rates, conversion rates, and customer acquisition costs.",
    "Brand positioning is key in today's competitive landscape. I suggest conducting competitive analysis to identify gaps in the market. Develop a unique value proposition that resonates with your target audience. Consider influencer partnerships and user-generated content to build authenticity and trust.",
  ],
  operations: [
    "Operational efficiency can be significantly improved through process automation and optimization. I recommend mapping out your current workflows to identify bottlenecks and redundancies. Implementing lean methodologies and continuous improvement practices will help reduce waste and increase productivity.",
    "From an operations standpoint, supply chain management is critical. Consider implementing inventory optimization systems, establishing strong supplier relationships, and developing contingency plans. Real-time tracking and data analytics can provide valuable insights for better decision-making.",
    "Quality management should be integrated into every operational aspect. I suggest implementing Six Sigma methodologies to reduce defects and variations. Regular training programs, clear standard operating procedures, and performance metrics will ensure consistent quality across all operations.",
  ],
};

export async function generateMockAnswer(question, studentSpecialty) {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

  let category = 'business';
  const specialty = studentSpecialty.toLowerCase();
  
  if (specialty.includes('technical') || specialty.includes('engineering')) {
    category = 'technical';
  } else if (specialty.includes('marketing') || specialty.includes('brand')) {
    category = 'marketing';
  } else if (specialty.includes('operations') || specialty.includes('process')) {
    category = 'operations';
  }

  const categoryResponses = responses[category];
  const randomResponse = categoryResponses[Math.floor(Math.random() * categoryResponses.length)];

  const openers = [
    `Great question! ${randomResponse}`,
    `Thank you for asking. ${randomResponse}`,
    `I'd be happy to help with that. ${randomResponse}`,
    `That's an important consideration. ${randomResponse}`,
  ];

  return openers[Math.floor(Math.random() * openers.length)];
}

