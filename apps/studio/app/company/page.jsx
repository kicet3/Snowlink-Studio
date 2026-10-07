import { redirect, notFound } from 'next/navigation';
export default function CompanyRedirect(){
  const value=process.env.NEXT_PUBLIC_COMPANY_SITE_URL;
  if(!value)notFound();
  let url;try{url=new URL(value);}catch{notFound();}
  if(!['https:','http:'].includes(url.protocol))notFound();
  redirect(url.href);
}
