'use client'

import Image from "next/image"

export default function Logo(){
    return(
        <div className="brand"> <Image src="/shieldmate_logo.png" width={25} height={25}  alt="Shield Mate Logo" /><div className="text-lg font-light">Shield Mate</div></div>
    )
}