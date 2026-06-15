// Helps find bugs during development in react
import { StrictMode } from 'react'  
// Creates the React application inside the HTML page.
import { createRoot } from 'react-dom/client'
// enables routing
import { BrowserRouter  } from 'react-router-dom'
//QueryClient - to handle api data
//QueryClient - Giving React Query to entire app.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// React Query Inspector 🔍
// Only developers use it.
// Users never see it.
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from 'sonner';

import App from "./App"
import "./index.css";



// react Query global config

const queryClient = new QueryClient({
  defaultOptions: {
  queries: {
    staleTime: 1000 * 60 * 5, //data stay fresh for 5 minutes
    retry: 1,     //if retry fails, do one more time 

// User switches tab
// Comes back
// ↓
// Don't call API again
    refetchOnWindowFocus: false, 
  },
  mutations: {
    retry: 0, //mutations means if post,put delete  fails dont retry automatically
  },
  },
});

createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
      <QueryClientProvider client={queryClient}>
          <App/> //This is your actual website.
          <Toaster position= "top-right" richColors/>
          {/* DevTools: only visible in development */}
          <ReactQueryDevtools initialIsOpen={false}/>
      </QueryClientProvider>
      </BrowserRouter>
    </StrictMode>
);