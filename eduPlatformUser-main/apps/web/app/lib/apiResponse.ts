import { NextResponse } from "next/server";

export function ok<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function created<T>(data: T, message = "Created successfully") {
  return NextResponse.json({ success: true, message, data }, { status: 201 });
}

export function badRequest(message: string) {
  return NextResponse.json({ success: false, message, data: null }, { status: 400 });
}

export function validationError(message: string) {
  return NextResponse.json({ success: false, message, data: null }, { status: 422 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ success: false, message, data: null }, { status: 500 });
}

export function gatewayError(message: string) {
  return NextResponse.json({ success: false, message, data: null }, { status: 502 });
}

export function serviceUnavailable(message: string) {
  return NextResponse.json({ success: false, message, data: null }, { status: 503 });
}
