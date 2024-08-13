"use client"
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {

  const router = useRouter();
  const onStart=()=>{
    router.push('/dashboard')
    //console.log("pushed")
}

  return (
    <div>
      <h2>Click on the button below to get started!</h2>
      <Button onClick={onStart}>Navigate to SignUp!</Button>
    </div>
  );
}
