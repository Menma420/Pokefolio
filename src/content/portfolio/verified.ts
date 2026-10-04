/** Authoritative B4 content: docs/design/Pokefolio_B4_Content_Source_of_Truth.docx.
 * Original resume bytes: public/documents/Uttkarsh_Malviya.pdf. No inferred location. */
export const VERIFIED_PROFILE={
 name:'UTTKARSH MALVIYA',title:'SDE INTERN',role:'ACKO / SDE INTERN',focus:'BACKEND SYSTEMS',school:'IIIT ALLAHABAD',
 fullName:'Uttkarsh Malviya',positioning:'Backend-focused SDE Intern',company:'Acko',period:'Jan 2026 - Present',
 education:'IIIT Allahabad - B.Tech, Information Technology',educationPeriod:'Nov 2022 - Jun 2026',
 summary:'Backend-focused SDE Intern with experience building production-scale distributed systems using Java, Spring Boot, microservices, and event-driven architectures. Skilled in designing APIs, orchestrating cross-service workflows, and owning services from design through deployment, monitoring, and production support.',
 highlights:['Production workflows at Acko.','50,000+ annotated cry samples.'],
 email:'uttkarshmalviya@gmail.com',phone:'+91 97933 03723',github:'https://github.com/Menma420',linkedin:'https://www.linkedin.com/in/uttkarsh-malviya-373231130/',resume:'/documents/Uttkarsh_Malviya.pdf',
 achievements:['Finalist, Flipkart Grid','CodeChef 3* (1770+)','Solved 1000+ DSA problems'],
};
export const VERIFIED_EXPERIENCE=[
 {id:'acko',company:'ACKO',role:'SDE Intern',period:'Jan 2026 - Present',shortPeriod:'JAN 2026 - PRESENT',sections:[
  {name:'SUMMARY',text:'SDE Intern\n'+VERIFIED_PROFILE.summary},
  {name:'OWNERSHIP',text:'Built an end-to-end invitation and family-membership system across two microservices, with idempotent state transitions and authorization checks. Developed the OneMG pharmacy vendor adapter for order creation, confirmation, cancellation, tracking, and catalog sync, with JWT-authenticated vendor communication.'},
  {name:'ENGINEERING',text:'Designed an adherence-tracking and subscription-continuation engine driving automated renew/pause/pivot decisions from recurring delivery data, with lifecycle validation and retry-safe, idempotent action processing. Built a financial reporting and settlement pipeline from event ingestion through transaction matching and vendor-payout allocation, later extended into a payment-orchestrator tenant integration with Razorpay/bank reconciliation.'},
  {name:'IMPACT',text:'Improved backend correctness and reliability through deduplication, conditional state transitions, transaction-boundary fixes, and targeted tests.'},
 ]},
 {id:'iiita-research',company:'IIIT ALLAHABAD',role:'Summer Research Intern',period:'May 2025 - Jul 2025',shortPeriod:'MAY-JUL 2025',sections:[
  {name:'SUMMARY',text:'Summer Research Intern\nInfant-cry data curation and machine-learning model benchmarking at IIIT Allahabad.'},
  {name:'OWNERSHIP',text:'Curated and annotated 50,000+ infant cry samples across the BabyChillanto, Donate-a-Cry, and Baby2020 datasets, expanding training data coverage by 35%.'},
  {name:'ENGINEERING',text:'Trained and benchmarked 8 machine learning and deep learning models including SVM, Random Forest, LightGBM, and CNN+GRU.'},
  {name:'IMPACT',text:'Achieved a 12% performance gain over baseline models.'},
 ]},
];
/** Personal skill evidence is resume-backed; project usage is shown only when separately sourced. */
export const VERIFIED_SKILLS:Array<[string,string,string]>=[
 ['Java','LANGUAGE','Java is part of the verified language skill set and backend-focused professional positioning.'],
 ['C++','LANGUAGE','C++ is part of the verified language skill set and object-oriented coursework.'],
 ['Python','LANGUAGE','Python is part of the verified language skill set; WeatherPi uses Python for its sensor pipeline.'],
 ['Go','LANGUAGE','Go powers the verified concurrent TCP scanner with Goroutines, worker pools and channels.'],
 ['SQL','LANGUAGE','SQL is part of the verified language skill set for working with relational data.'],
 ['JavaScript','LANGUAGE','JavaScript is part of the verified language skill set.'],
 ['Spring Boot','BACKEND','Spring Boot is named in the verified backend skill set and professional positioning.'],
 ['REST APIs','BACKEND','API design is part of the verified backend skill set and professional work.'],
 ['Microservices','DISTRIBUTED','The invitation and family-membership system spans two microservices.'],
 ['OpenFeign','BACKEND','OpenFeign is a verified backend and distributed-systems skill.'],
 ['WebClient','BACKEND','WebClient is a verified backend and distributed-systems skill.'],
 ['AWS SQS','DISTRIBUTED','AWS SQS is named in the verified backend and distributed-systems skill set.'],
 ['Temporal','DISTRIBUTED','Temporal is a verified workflow skill; Acko authored material notes a later Temporal design.'],
 ['EVENT-DRIVEN ARCH','DISTRIBUTED','Event-driven architecture is part of the verified professional positioning.'],
 ['PostgreSQL','DATABASE','PostgreSQL supports verified NomNom persistence and the authored Karsh data layer.'],
 ['AWS RDS','DATABASE','AWS RDS is named in the verified database skill set.'],
 ['Elasticsearch','DATABASE','Elasticsearch is named in the verified database and search skill set.'],
 ['AWS','CLOUD','AWS is named in the verified cloud skill set.'],
 ['Docker','DEVOPS','Docker is named in the verified cloud and DevOps skill set.'],
 ['Jenkins','DEVOPS','Jenkins is named in the verified cloud and DevOps skill set.'],
 ['CI/CD','DEVOPS','CI/CD is part of the verified engineering tool set.'],
 ['Datadog','OBSERVABILITY','Datadog is named in the verified observability skill set.'],
 ['Coralogix','OBSERVABILITY','Coralogix is named in the verified observability skill set.'],
 ['DSA','CONCEPT','Data structures and algorithms are verified coursework; 1000+ solved problems are authored achievements.'],
 ['OOP','CONCEPT','Object-oriented programming is verified coursework, including Java and C++.'],
 ['DBMS','CONCEPT','Database management systems are verified core coursework.'],
 ['Operating Systems','CONCEPT','Operating systems are verified core coursework.'],
 ['Computer Networks','CONCEPT','Computer networks are verified core coursework.'],
 ['Concurrency','CONCEPT','The verified Go scanner uses Goroutines, worker pools and configurable concurrency.'],
 ['Git','DEVOPS','Git is named in the supplied resume methodology and tool set.'],
 ['Agile/Scrum','CONCEPT','Agile/Scrum is named in the supplied resume methodology and tool set.'],
 ['Software Engineering','CONCEPT','Software Engineering is listed as relevant coursework in the supplied resume.'],
 ['Parallel Computing','CONCEPT','Parallel and Distributed Computing is verified coursework, with authored HPC project evidence.'],
];
export const VERIFIED_PROJECTS:Record<string,{technologies:string[];summary:string;impact:string[];period?:string;role?:string}>={
 NOMNOM:{technologies:['Next.js','TypeScript','PostgreSQL','Prisma','Stripe','Clerk','OpenAI'],summary:'Developed a full-stack SaaS platform that generates personalized meal plans via OpenAI, with subscription-based access, authentication, and premium feature gating. Managed the Stripe subscription lifecycle with webhook-driven synchronization and built secure backend APIs with Next.js server routes, Prisma, and PostgreSQL.',impact:['Subscription-based access, authentication, premium feature gating and webhook-driven billing synchronization.']},
 PORT_SCANNER:{technologies:['Go','TCP/IP','Concurrency'],summary:'Developed a concurrent TCP port scanner using Goroutines and worker pools for parallel network scans, with structured JSON output. Added configurable concurrency controls and connection management to optimize resource utilization.',impact:['Configurable concurrency controls and connection management optimize resource utilization.']},
 ACKO_CLINIC:{technologies:['Java','Spring Boot','Microservices','Event-Driven Architecture'],summary:'Clinic Journey Management and adjacent backend workflows at Acko.',impact:[VERIFIED_EXPERIENCE[0]!.sections[3]!.text],period:'Jan 2026 - Present',role:'SDE Intern'},
};
