import { Resend } from 'resend';
import PDFDocument from 'pdfkit';

const resend = new Resend(process.env.RESEND_API_KEY);

async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const W = doc.page.width;  // 595
    const H = doc.page.height; // 842

    // ── Header band ──
    doc.rect(0, 0, W, 72).fill('#1b3a5c');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(24)
       .text('NEXIME', 40, 16);
    doc.fillColor('rgba(180,220,240,0.9)').font('Helvetica').fontSize(9)
       .text('HEALTHCARE', 40, 44);
    doc.fillColor('white').font('Helvetica-Bold').fontSize(15)
       .text('WEEKLY TIMESHEET', 0, 22, { align: 'center', width: W });
    doc.fillColor('rgba(200,230,250,0.7)').font('Helvetica').fontSize(9)
       .text(`Reference: ${data.reference}`, 0, 42, { align: 'center', width: W });

    // ── Info band ──
    doc.rect(0, 72, W, 48).fill('#eaf6fd');
    const infoY = 82;
    [
      { label: 'STAFF MEMBER', val: data.staffName,   x: 40 },
      { label: 'WEEK ENDING',  val: data.weekEnding,  x: 200 },
      { label: 'SUBMITTED',    val: new Date().toLocaleDateString('en-GB'), x: 360 },
    ].forEach(({ label, val, x }) => {
      doc.fillColor('#0e8fd4').font('Helvetica-Bold').fontSize(7).text(label, x, infoY);
      doc.fillColor('#1b3a5c').font('Helvetica-Bold').fontSize(12).text(val, x, infoY + 12);
    });
    doc.fillColor('#0e8fd4').font('Helvetica-Bold').fontSize(7).text('TOTAL HOURS', 470, infoY);
    doc.fillColor('#3db84a').font('Helvetica-Bold').fontSize(16).text(`${data.totalHours} hrs`, 470, infoY + 10);

    // ── Table — columns adjusted to fit signature inline ──
    // Cols: Day, Type, Date, Start, End, Break, Hours, Client, Auth, Signature
    const cols  = [40, 78, 116, 180, 218, 256, 294, 332, 400, 452];
    const heads = ['Day','Type','Date','Start','End','Break','Hours','Client / Unit','Auth By','Signature'];
    const tTop  = 134;
    const ROW_H = 28; // taller rows to fit signature image inline

    doc.rect(40, tTop, W - 80, 18).fill('#0e8fd4');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(7);
    heads.forEach((h, i) => doc.text(h, cols[i] + 2, tTop + 5));

    let y = tTop + 20;
    let alt = false;

    data.days.forEach(dayData => {
      const { day, shifts, sleepIn } = dayData;

      const drawRow = (rowData, label, isShift) => {
        if (!rowData) return;

        // Row background
        doc.rect(40, y - 2, W - 80, ROW_H)
           .fill(isShift ? (alt ? '#f8f8f8' : 'white') : '#f0f8ff');

        const mid = y + ROW_H/2 - 6; // vertical centre for text

        // Day name
        doc.fillColor('#1b3a5c').font('Helvetica-Bold').fontSize(8)
           .text(day.slice(0,3), cols[0]+2, mid);

        // Type label
        doc.fillColor(isShift ? '#1a6b2a' : '#094f80')
           .font('Helvetica').fontSize(8).text(label, cols[1]+2, mid);

        // Date / times / break
        doc.fillColor('#1b3a5c').font('Helvetica').fontSize(8)
           .text((d=>{if(!d||d==='-')return '-';const p=d.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d;})(rowData.date),  cols[2]+2, mid)
           .text(rowData.start||'-', cols[3]+2, mid)
           .text(rowData.end||'-',   cols[4]+2, mid)
           .text(rowData.brk > 0 ? `${(rowData.brk/60).toFixed(2)}` : '-', cols[5]+2, mid);

        // Hours
        doc.fillColor(isShift ? '#1a6b2a' : '#0e8fd4')
           .font('Helvetica-Bold').fontSize(8).text(rowData.hours, cols[6]+2, mid);

        // Client / unit
        const clientUnit = `${rowData.client||'-'}${rowData.unit ? ' / '+rowData.unit : ''}`;
        doc.fillColor('#1b3a5c').font('Helvetica').fontSize(7)
           .text(clientUnit.substring(0,16), cols[7]+2, mid);

        // Auth name
        doc.fillColor('#1b3a5c').font('Helvetica').fontSize(7)
           .text((rowData.auth||'-').substring(0,12), cols[8]+2, mid);

        // ── Signature INLINE in the row ──
        if (rowData.sig) {
          try {
            const sigBuf = Buffer.from(rowData.sig.split(',')[1], 'base64');
            // Draw signature image inline, vertically centred in the row
            doc.image(sigBuf, cols[9]+2, y, { height: ROW_H - 4, fit:[90, ROW_H - 4] });
          } catch(e) {
            doc.fillColor('#1a6b2a').font('Helvetica-Bold').fontSize(7)
               .text('✓ Signed', cols[9]+2, mid);
          }
        } else if (rowData.client === 'Turner Home') {
          doc.fillColor('#f5a0a0').font('Helvetica').fontSize(7)
             .text('Pending', cols[9]+2, mid);
        } else {
          doc.fillColor('#b0d8e8').font('Helvetica').fontSize(7)
             .text('N/A', cols[9]+2, mid);
        }

        y += ROW_H;
      };

      if(shifts&&shifts.length) shifts.forEach(sh=>drawRow(sh,'Shift',true));
      drawRow(sleepIn,'Sleep In',false);

      alt = !alt;

      // New page if running out of space
      if (y > H - 100) {
        doc.addPage();
        y = 40;
      }
    });

    // Total already shown in header band — removed from bottom

    // ── Footer ──
    doc.rect(0, H-36, W, 36).fill('#1b3a5c');
    doc.fillColor('rgba(255,255,255,0.5)').font('Helvetica').fontSize(7.5)
       .text(
         'Nexime Healthcare Ltd  |  0151 673 1899  |  payroll@neximehealthcare.co.uk  |  neximehealthcare.co.uk',
         0, H-26, { align: 'center', width: W }
       )
       .text(
         'Registered in England & Wales  |  Co. Reg: 11008626',
         0, H-15, { align: 'center', width: W }
       );

    doc.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const data = req.body;

    // Generate branded PDF
    const pdfBuffer = await generatePDF(data);

    // Send via Resend
    const { error } = await resend.emails.send({
      from: 'Nexime Timesheet <timesheet@neximehealthcare.co.uk>',
      to:   ['payroll@neximehealthcare.co.uk'],
      subject: `Timesheet — ${data.staffName} — Week Ending ${data.weekEnding}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#1b3a5c;max-width:580px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#1b3a5c,#0e8fd4);padding:24px 28px;border-radius:10px 10px 0 0">
            <h1 style="color:white;margin:0;font-size:22px;letter-spacing:3px">NEXIME</h1>
            <p style="color:rgba(255,255,255,.65);margin:3px 0 0;font-size:10px;letter-spacing:7px">HEALTHCARE</p>
            <p style="color:white;margin:10px 0 0;font-size:14px;font-weight:700">Weekly Timesheet Submission</p>
          </div>
          <div style="background:#eaf6fd;padding:16px 28px;border-bottom:2px solid #b0d8e8">
            <table style="width:100%;font-size:13px;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;color:#0e8fd4;font-size:10px;text-transform:uppercase;font-weight:700;width:130px">Staff Member</td>
                <td style="font-weight:700;font-size:15px">${data.staffName}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#0e8fd4;font-size:10px;text-transform:uppercase;font-weight:700">Week Ending</td>
                <td style="font-weight:700">${data.weekEnding}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#0e8fd4;font-size:10px;text-transform:uppercase;font-weight:700">Total Hours</td>
                <td style="font-weight:800;font-size:18px;color:#3db84a">${data.totalHours} hrs</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#0e8fd4;font-size:10px;text-transform:uppercase;font-weight:700">Reference</td>
                <td style="font-weight:700">${data.reference}</td>
              </tr>
            </table>
          </div>
          <div style="padding:16px 28px;background:white;font-size:13px;color:#7a8a9a">
            Timesheet is attached as a PDF.
          </div>
          <div style="background:#1b3a5c;padding:14px;text-align:center;border-radius:0 0 10px 10px">
            <p style="color:rgba(255,255,255,.5);font-size:10px;margin:0">
              Nexime Healthcare Ltd &nbsp;|&nbsp; neximehealthcare.co.uk
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Nexime_Timesheet_${data.staffName.replace(/\s+/g,'_')}_${data.weekEnding.replace(/\s+/g,'_')}.pdf`,
          content:  pdfBuffer.toString('base64'),
        }
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ error });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Server error:', e);
    return res.status(500).json({ error: e.message });
  }
}
