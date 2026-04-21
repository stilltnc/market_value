import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress, reverseGeocode } from '@/lib/geocoding'

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')
  const lat = request.nextUrl.searchParams.get('lat')
  const lng = request.nextUrl.searchParams.get('lng')

  if (lat && lng) {
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng))
    return NextResponse.json({ result })
  }

  if (!address) {
    return NextResponse.json({ error: 'Parâmetro address obrigatório' }, { status: 400 })
  }

  const result = await geocodeAddress(address)
  return NextResponse.json({ result })
}
