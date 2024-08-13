# Full Stack AI Mock Interview App with Next.js

Welcome to the Full Stack AI Mock Interview App! In this project, I have built and deployed a powerful AI-driven mock interview application using cutting-edge technologies like React, Drizzle ORM, Gemini AI, and Clerk.

## 🚀 Project Overview

This application provides a comprehensive platform for conducting AI-powered mock interviews, offering users a realistic and interactive experience. The app is designed to help users prepare effectively for real-world interviews by generating AI-driven questions and recording responses.

## 📚 Key Insights

- **Implement Social and Email Password Authentication with Clerk**: Secured the app with Clerk's authentication services.
- **PostgreSQL and Drizzle Setup**: Set up PostgreSQL (Neon Serverless) as the database and configure Drizzle ORM for data management.
- **Generate AI Interview Questions**: Leveraged Gemini Fash 1.5 AI Model to create realistic interview questions.
- **Record User Answer Using Web and Microphone**: Captures user responses via web and microphone inputs. Videos are not recorded or stored.
- **Convert Speech to Text**: Implements speech-to-text conversion for user responses.
- **Record/Save User Response**: Stores user responses securely in the database.
- **Use Generative AI to get feedback and rating**: Present feedback and rating for each interview question answered.
- **Deploy App on Vercel**: Leveraged Vercel to deploy the application on the cloud.

## 🛠️ Technologies Used

- **Frontend**: React, Next.js, TailwindCSS
- **Backend**: Node.js, Drizzle ORM, PostgreSQL
- **AI Integration**: Google Gemini API
- **Authentication**: Clerk
- **Deployment**: Vercel

## 📖 Getting Started

1. Clone the Repository: 
  
   git clone https://github.com/your-username/mock-interview-app.git
   cd mock-interview-app

2. Install Dependencies:
 ```bash
npm install
```
3. Set Up Environment Variables: Configure your .env file with the necessary credentials for Clerk, PostgreSQL, Google Gemini API, and other required constants.
   
4. Run the Application:
 ```bash
1. npm run dev //to start the project on localhost:3000
2. npm run db:push //to push changes to the database
3. npm run db:studio //to view database
```

5. Deploy on Vercel: Follow the instructions on Vercel to deploy your app.

## Conclusion
Feel free to submit any PRs, Issues, and or suggestions for this project. If you like the project, please 🌟 the repository.
