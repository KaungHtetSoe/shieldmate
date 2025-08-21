'use client'

import Image from "next/image"

export default function Logo(){
    return(
        <div className="brand"> <Image src="/shieldmate_logo.png" width={25} height={25}  alt="Shield Mate Logo" /><div className="text-lg font-light dark:text-gray-50 dark:text-shadow-md text-shadow-gray-800">Shield Mate</div></div>
    )
}