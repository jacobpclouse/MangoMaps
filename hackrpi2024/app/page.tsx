"use client";

import Image from "next/image";
import React from "react";
import { doto, sourGummy } from "./fonts";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen overflow-clip">
      <div className="bg-[#CBC3E3] absolute top-[18rem] -z-10 right-[-18rem] h-[60rem] w-[60rem] rounded-full blur-[10rem]"></div>

      <div className="bg-[#f59996] absolute top-[-28rem] -z-10 left-[-22rem] h-[73rem] w-[73rem] rounded-full blur-[10rem]"></div>

      <div className="px-12 max-w-[100rem] mx-auto w-full h-full flex flex-col items-center justify-center overflow-scroll">
      	<div className="flex gap-0 md:gap-3 items-center justify-center ">
	        <Image
	          src="/MangoPair.png"
	          alt="MangoMaps logo"
	          width={0}
	          height={0}
	          className="w-[20rem] h-fit object-cover"
	          sizes="50vw"
	        />
	        <h1
	          className={`text-6xl md:text-7xl font-bold text-center ${doto.className}`}
	        >
	          Mango Maps
	        </h1>
	      </div>
	      <p
	        className={`mt-12 text-xl text-center md:text-2xl px-12 ${sourGummy.className}`}
	      >
	        Ultra-Realistic, Data-Driven Disaster Simulation Playground to Limit Test
	        Your Urban Cities
	      </p>
	      <Link
	        href="/map"
	        className="text-lg flex mt-8 gap-2 items-center justify-center bg-orange-500 py-3 px-5 rounded-2xl text-white hover:gap-3 hover:px-4 duration-150"
	      >
	        Maps <ArrowRightIcon className="size-4" />
	      </Link>
      </div>
    </div>
  );
};

export default App;
