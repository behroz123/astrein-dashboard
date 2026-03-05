#!/usr/bin/env node
/**
 * Script to recalculate rent payments for all apartments
 * Run with: node recalculate-payments.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'astrein-serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://astrein-dashboard-3ec41.firebaseio.com"
  });
} catch (error) {
  console.error('❌ Firebase service account key not found at:', serviceAccountPath);
  console.error('Please ensure astrein-serviceAccountKey.json is in the project root');
  process.exit(1);
}

const db = admin.firestore();

function generatePayments(moveInDate, rent, moveOutDate) {
  if (!moveInDate || !rent) return [];
  
  const payments = [];
  const startDate = new Date(moveInDate);
  const monthlyRent = parseFloat(rent);
  
  let endDate;
  if (moveOutDate) {
    endDate = new Date(moveOutDate);
  } else {
    endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);
  }
  
  let currentDate = new Date(startDate);
  
  // Check if move-out is in the same month as move-in
  const moveOutDateObj = moveOutDate ? new Date(moveOutDate) : null;
  const isSameMonth = moveOutDateObj && 
    currentDate.getMonth() === moveOutDateObj.getMonth() && 
    currentDate.getFullYear() === moveOutDateObj.getFullYear();
  
  if (isSameMonth && moveOutDateObj) {
    // Same month - calculate pro-rata for partial month
    const firstMonth = currentDate.getMonth() + 1;
    const firstYear = currentDate.getFullYear();
    const moveInDay = currentDate.getDate();
    const moveOutDay = moveOutDateObj.getDate();
    const daysInMonth = new Date(firstYear, firstMonth, 0).getDate();
    const daysUsed = moveOutDay - moveInDay + 1;
    const proRataAmount = (monthlyRent / daysInMonth * daysUsed).toFixed(2);
    
    payments.push({
      month: firstMonth,
      year: firstYear,
      amount: proRataAmount,
      paid: false,
    });
    return payments;
  }
  
  // First month - Pro-rata calculation
  const firstMonth = currentDate.getMonth() + 1;
  const firstYear = currentDate.getFullYear();
  const moveInDay = currentDate.getDate();
  const daysInFirstMonth = new Date(firstYear, firstMonth, 0).getDate();
  const daysRemaining = daysInFirstMonth - moveInDay + 1;
  const proRataAmount = (monthlyRent / daysInFirstMonth * daysRemaining).toFixed(2);
  
  payments.push({
    month: firstMonth,
    year: firstYear,
    amount: proRataAmount,
    paid: false,
  });
  
  // All further months until end date
  currentDate.setMonth(currentDate.getMonth() + 1);
  currentDate.setDate(1);
  
  while (currentDate <= endDate) {
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    
    // Last month (on move-out) - Pro-rata calculation
    if (moveOutDate) {
      const lastMonth = moveOutDateObj.getMonth() + 1;
      const lastYear = moveOutDateObj.getFullYear();
      
      if (month === lastMonth && year === lastYear) {
        const moveOutDay = moveOutDateObj.getDate();
        const daysInLastMonth = new Date(lastYear, lastMonth, 0).getDate();
        const daysUsed = moveOutDay;
        const lastMonthAmount = (monthlyRent / daysInLastMonth * daysUsed).toFixed(2);
        
        payments.push({
          month,
          year,
          amount: lastMonthAmount,
          paid: false,
        });
        break;
      }
    }
    
    payments.push({
      month,
      year,
      amount: rent,
      paid: false,
    });
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return payments;
}

async function recalculateAllPayments() {
  try {
    console.log('🔄 Starting payment recalculation...\n');
    
    const propertiesRef = db.collection('properties');
    const snapshot = await propertiesRef.get();
    
    let updatedCount = 0;
    
    for (const doc of snapshot.docs) {
      const property = doc.data();
      const rooms = property.rooms || [];
      let hasChanges = false;
      
      const updatedRooms = rooms.map(room => ({
        ...room,
        beds: room.beds.map(bed => {
          if (bed.tenant && bed.rent && bed.moveInDate) {
            const newPayments = generatePayments(bed.moveInDate, bed.rent, bed.moveOutDate);
            const oldPayments = JSON.stringify(bed.payments || []);
            const newPaymentsStr = JSON.stringify(newPayments);
            
            if (oldPayments !== newPaymentsStr) {
              hasChanges = true;
              return {
                ...bed,
                payments: newPayments
              };
            }
          }
          return bed;
        })
      }));
      
      if (hasChanges) {
        await propertiesRef.doc(doc.id).update({
          rooms: updatedRooms,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updatedCount++;
        console.log(`✅ Updated: ${property.adresse || property.address}`);
      }
    }
    
    console.log(`\n✨ Recalculation complete! Updated ${updatedCount} properties.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during recalculation:', error);
    process.exit(1);
  }
}

recalculateAllPayments();
