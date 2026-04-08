/**
 * TypeScript mirror of the existing database_data JSON shape.
 * Field names use snake_case to match the current Python/SQL contract.
 */

export interface DatabaseLogoData {
  image_url: string;
  logo_alt_text: string;
  logo_width: number;
  logo_height: number;
}

export interface DatabaseContactDetails {
  phone: string;
  email: string;
  hours: Record<string, string>;
  address: string;
}

export interface DatabaseLocationData {
  address: string;
  latitude: number;
  longitude: number;
  map_url: string;
  directions: string;
  timezone: string;
}

export interface DatabaseService {
  id: number;
  uuid: string;
  name: string;
  description: string;
  service_type: string;
  default_price: number;
  default_is_variable_price: boolean;
  default_duration_mins: number;
}

export interface DatabaseServicesData {
  services: DatabaseService[];
}

export interface DatabaseStaffMember {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  title: string;
  bio: string;
  photo_url: string;
  email: string;
  phone: string;
  specialties: string[];
}

export interface DatabaseStaffData {
  staff_members: DatabaseStaffMember[];
}

/**
 * Complete database_data shape as returned by the backend SQL queries.
 */
export interface DatabaseData {
  company_name: string;
  salon_uuid: string;
  logo_data: DatabaseLogoData;
  contact_details: DatabaseContactDetails;
  location_data: DatabaseLocationData;
  services_data: DatabaseServicesData;
  staff_data: DatabaseStaffData;
  website_url: string;
  timezone: string;
  google_analytics_tracking_id?: string;
}
