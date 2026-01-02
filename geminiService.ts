
import { GoogleGenAI } from "@google/genai";
import { Assignment, Submission, Section } from './types';

export const analyzeResearchData = async (
  assignments: Assignment[],
  submissions: Submission[]
) => {
  // Fix: Initialize GoogleGenAI strictly using process.env.API_KEY as per coding guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const statsSummary = {
    totalAssignments: assignments.length,
    totalSubmissions: submissions.length,
    bySection: {
      [Section.EINSTEIN_G11]: {
        assignments: assignments.filter(a => a.section === Section.EINSTEIN_G11).length,
        submissions: submissions.filter(s => {
          const ass = assignments.find(a => a.id === s.assignmentId);
          return ass?.section === Section.EINSTEIN_G11;
        }).length
      },
      [Section.GALILEI_G12]: {
        assignments: assignments.filter(a => a.section === Section.GALILEI_G12).length,
        submissions: submissions.filter(s => {
          const ass = assignments.find(a => a.id === s.assignmentId);
          return ass?.section === Section.GALILEI_G12;
        }).length
      }
    }
  };

  const prompt = `
    As the Mustang Stride research data analyst, analyze this assignment platform usage data:
    ${JSON.stringify(statsSummary, null, 2)}
    
    Provide a brief (max 100 words) executive summary of the student participation across the two sections (Einstein vs Galilei). 
    Highlight which group is taking the lead in their academic stride.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    // Fix: Access response.text directly as a property, not a method
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate AI analysis at this time.";
  }
};
