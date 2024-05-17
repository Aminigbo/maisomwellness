import React from 'react'
import Sidebar from '../Components/Sidebar'
import DashHeader from '../Components/DashHeader'
import logo from '../images/logo.jpeg'
import { connect } from 'react-redux'
import { Notify, NumberWithCommas } from '../utils'
import { LoadingButton } from '@mui/lab'
import { toast, ToastContainer } from 'react-toastify';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SaveInvoiceModel, deleteInvoice, fetchAllInvoices, fetchAllInvoicesByBranch, fetchAllInvoicesBySalesRep, fetchSingleInvoices, getAllMarketers, updateInvoiceStatus } from '../service/supabase-service'
import { Backdrop, Box, CircularProgress, Divider, Fade, Modal, Typography } from '@mui/material'
import { Invoice_Product, Saved_invoices, View_invoice } from '../redux/state/action'
import { formatDate } from '@canvasjs/charts'
import { FaArrowAltCircleLeft, FaArrowAltCircleRight, FaCheck, FaCheckDouble, FaDownload, FaPrint, FaSmile, FaTimes } from 'react-icons/fa'
import { FaDeleteLeft, FaMoneyBill } from 'react-icons/fa6'
import { BsCalculator, BsSendCheck } from 'react-icons/bs'


import { useReactToPrint } from 'react-to-print';


const Invoice = ({
    appState, disp_savedInvoice, disp_invoice_products,
    disp_view_invoice
}) => {
    const InvoiceProducts = appState.AllInvoiceProducts
    const User = appState.User
    const SavedInvoices = appState.SavedInvoices;

    const ViewInvoice = appState.ViewInvoice;
    const [loading, setloading] = React.useState(false)

    // const InvoiceAmount = InvoiceProducts.product.reduce((acc, item) => acc + item.totalCost * item.qty, 0);
    const InvoiceAmount = InvoiceProducts.product ? InvoiceProducts.product.reduce((acc, item) => acc + item.totalCost * item.qty, 0) : 0;
    const vat = parseInt(InvoiceAmount * 7.5 / 100)
    const [amountWithVAT, setamountWithVAT] = React.useState(InvoiceAmount + vat)
    const [amountWithoutVat, setamountWithoutVat] = React.useState(InvoiceAmount)
    const [amountToPay, setamountToPay] = React.useState(InvoiceAmount + vat)

    const [customerphone, setcustomerphone] = React.useState("")
    const [marketerid, setmarketerid] = React.useState("")
    const [allmarketers, setallmarketers] = React.useState([])

    const [open, setOpen] = React.useState(false);
    const [paymentMetheod, setpaymentMetheod] = React.useState("Bank transfer");
    const [complimentaryMethod, setcomplimentaryMethod] = React.useState("SELECT");
    const [discount, setdiscount] = React.useState("");
    const [isdiscount, setisdiscount] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const style = {
        position: 'absolute',
        top: '3%',
        left: '25%',
        // transform: 'translate(-50%, -50%)',
        width: "50%",
        bgcolor: 'background.paper',
        // border: '2px solid #000',
        boxShadow: 4,
        maxHeight: "90%",
        p: 4,
        overflow: "auto",
    };

    function getFormattedDate() {
        const date = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const formattedDate = formatter.format(date);

        // Function to add "st", "nd", "rd", or "th" to the day
        function getDayWithSuffix(day) {
            if (day >= 11 && day <= 13) {
                return `${day}th`;
            }
            switch (day % 10) {
                case 1:
                    return `${day}st`;
                case 2:
                    return `${day}nd`;
                case 3:
                    return `${day}rd`;
                default:
                    return `${day}th`;
            }
        }

        const [month, day, year] = formattedDate.split(' ');
        const formattedDay = getDayWithSuffix(parseInt(day));

        return `${formattedDay} ${month}, ${year}`;
    }


    const handleDownloadClick = () => {
        const input = document.getElementById('pdf-content');

        html2canvas(input)
            .then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const pageHeight = 295;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                pdf.save('download.pdf');
            });
    };

    const handlePrintClick = () => {
        const input = document.getElementById('pdf-content');

        html2canvas(input).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Open PDF in new window
            const pdfData = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfData);
            const printWindow = window.open(pdfUrl);

            // Print PDF
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                    setloading(false)
                };
                // disp_view_invoice(null)
            } else {
                alert('Please enable pop-ups for this website to print the PDF.');
            }
        });
    }

    function saveInvoice(type) {
        setloading(true)

        if (type == "PRINT") {
            handlePrintClick()
            setloading(false)
        } else {
            handleDownloadClick()
            setloading(false)
        }

    }

    let confirmPayment = (data) => {
        setloading(true)
        updateInvoiceStatus(InvoiceProducts.invoiceID, marketerid, customerphone, data)
            .then(response => {
                if (response.error) {

                }
                fetchSingleInvoices(InvoiceProducts.invoiceID)
                    .then(response => {
                        fetchAllInvoicesBySalesRep(User.name)
                            .then(response2 => {
                                disp_savedInvoice(response2.data)
                                disp_invoice_products(response.data[0])
                                Notify("Payment confirmed successfully")
                                setTimeout(() => {
                                    saveInvoice("PRINT")
                                    setloading(false)
                                }, 1000);

                                // disp_view_invoice(null)
                            })
                    })
                    .catch(error => {
                        setloading(false)
                    })

            })
            .catch(error => {
                setloading(false)
            })
    }

    function FetchInvoices() {
        fetchAllInvoicesByBranch(User.branch)
            .then(response => {
                setloading(false)
                disp_savedInvoice(response.data)
            })
            .catch(error => {
                setloading(false)
            })
    }

    React.useEffect(() => {
        // setloading(true)
        FetchInvoices()
        getAllMarketers()
            .then(response => {
                if (!response.error) {
                    setallmarketers(response.data)
                }
            })
    }, [])


    let costOfProducts = InvoiceAmount
    let discountAmount = ((costOfProducts) * parseInt(discount)) / 100
    let taxWithDiscount = ((InvoiceAmount) - (discountAmount)) * 0.075
    let grossTotal = ((costOfProducts) - (discountAmount)) + (taxWithDiscount)
    let grossTotalWithoutDiscount = ((costOfProducts) + (costOfProducts * 0.075))


    function Paymentbutton() {
        return <>
            <div style={{
                padding: 10,
                backgroundColor: "#F1F6FC",
                display: "flex",
                flexDirection: "column",
                marginTop: 20,
                // justifyContent: "space-between",
                // alignItems: "center"
            }}>
                <div style={{
                    padding: 10,
                    backgroundColor: "#F1F6FC",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                }}>
                    <p style={{ color: "#000", fontSize: 15, fontWeight: 700 }}  > Subtotal</p>
                    <p style={{ color: "#000", fontSize: 15, fontWeight: 700 }}  > ₦{NumberWithCommas(costOfProducts)} </p>
                </div>

                {discount > 0 &&
                    <div style={{
                        padding: 10,
                        backgroundColor: "#F1F6FC",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                    }}>
                        <p style={{ color: "#000", fontSize: 15, fontWeight: 700 }}  > Discount</p>
                        <p style={{ color: "#000", fontSize: 15, fontWeight: 700 }}  > ₦{NumberWithCommas(discountAmount)} <small>( {discount}%) </small>  </p>
                    </div>

                }

                <div style={{
                    padding: 10,
                    backgroundColor: "#F1F6FC",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                }}>
                    <p style={{ color: "#000", fontSize: 12, fontWeight: 300 }}  > Tax (VAT)</p>
                    <p style={{ color: "#000", fontSize: 15, fontWeight: 700 }}  > ₦{discount > 0 ? NumberWithCommas(taxWithDiscount) : NumberWithCommas(vat)} </p>
                </div>

                <div style={{
                    padding: 10,
                    backgroundColor: "#F1F6FC",
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                }}>
                    <p style={{ color: "#000", fontSize: 15, fontWeight: 700 }}  > Total</p>
                    <p style={{ color: "#000", fontSize: 15, fontWeight: 700 }}  > ₦{NumberWithCommas(discount > 0 ? grossTotal : grossTotalWithoutDiscount)} </p>
                </div>


            </div>

            <center style={{
                marginTop: 20,
                marginBottom: 40
            }} >

                <p
                    onClick={() => {
                        if (amountToPay < amountWithVAT && complimentaryMethod == "SELECT") {

                        } else {
                            let productCost = InvoiceAmount;
                            let productCostPlusVat = discount > 0 ? grossTotal : amountWithVAT;
                            let taxAmount = discount > 0 ? taxWithDiscount : vat;
                            let discount_amount = discountAmount
                            // console.log(productCostPlusVat)
                            confirmPayment({
                                productCost,
                                productCostPlusVat,
                                taxAmount,
                                discount_amount,
                                amountToPay,
                                paymentMetheod,
                                complimentaryMethod
                            })
                            handleClose()
                            // disp_view_invoice(null)
                        }
                    }}
                    style={{
                        color: amountToPay < amountWithVAT && complimentaryMethod == "SELECT" ? "#061B34" : "#fff",
                        backgroundColor: amountToPay < amountWithVAT && complimentaryMethod == "SELECT" ? "#fff" : "#061B34",
                        padding: 20,
                        paddingRight: 10,
                        paddingLeft: 10,
                        marginLeft: 10,
                        borderRadius: 6,
                        cursor: amountToPay < amountWithVAT && complimentaryMethod == "SELECT" ? "no-drop" : "pointer",
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 300,
                    }}
                >
                    Generate invoice
                </p>

            </center>

        </>
    }



    function AmountToPay() {
        let costOfProducts = InvoiceAmount
        let discountAmount = ((costOfProducts) * parseInt(discount)) / 100
        let taxWithDiscount = ((InvoiceAmount) - (discountAmount)) * 0.075
        let taxWithoutDiscount = (InvoiceAmount) * 0.075
        let grossTotal = ((costOfProducts) - (discountAmount)) + (taxWithDiscount)
        return <>
            <p
                style={{
                    color: "#000",
                    fontSize: 13,
                    fontWeight: 500,
                    marginRight: 20
                }}
            >
                {complimentaryMethod}
            </p>

            <p
                style={{
                    color: "#000",
                    fontSize: 15,
                    fontWeight: 500,
                    marginRight: 20
                }}
            >
                ₦{NumberWithCommas(discount ? grossTotal - amountToPay : InvoiceAmount - amountToPay + taxWithoutDiscount)}
                {/* ₦{NumberWithCommas(taxWithDiscount)} */}
            </p>
        </>
    }

    function PaymentInvoiceDispaly() {
        let costOfProducts = InvoiceAmount
        let discountAmount = ((costOfProducts) * parseInt(discount)) / 100
        let taxWithDiscount = ((InvoiceAmount) - (discountAmount)) * 0.075
        let grossTotal = ((costOfProducts) - (discountAmount)) + (taxWithDiscount)

        return <div>

            <table className='table2'>
                <tr className='tr2'>
                    {/* <th>Total</th> */}
                    {/* <th>TOTAL</th> */}
                </tr>
                <tr>
                    <td>
                        Cost of prod.
                    </td>
                    <td className='total' style={{ fontWeight: 500, color: "#000" }} >{NumberWithCommas(`₦${costOfProducts}`)}</td>
                </tr>

                {discount > 0 &&
                    <tr>
                        <td>Discount</td>
                        <td> (-) {NumberWithCommas(`₦${discountAmount}`)}  <small>( {discount}%) </small> </td>
                    </tr>
                }

                <tr>
                    <td style={{ color: "#000" }}>Tax (VAT)</td>
                    <td style={{ color: "#000" }}>(+) ₦{discount > 0 ? NumberWithCommas(taxWithDiscount) : NumberWithCommas(vat)}</td>
                </tr>

                <tr style={{ marginTop: 10, alignItems: "center" }} >
                    <td style={{ color: "#000" }}>Total</td>
                    <td className='total' style={{ fontSize: 19, fontWeight: 900, color: "#000" }} > ₦{NumberWithCommas(discount > 0 ? grossTotal : costOfProducts + vat)}</td>
                </tr>
                <br /><br />

                <p style={{ color: "#000", padding: 5, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, }} >
                    {InvoiceProducts.paid ? <>INVOICE PAID  </> : <> NOT PAID </>}
                </p>
            </table>


            {InvoiceProducts.paid && <>


                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 20,
                    marginBottom: 6,
                }}>
                    <b style={{ color: "#000", fontSize: 14 }} >Payment method</b>
                </div>
                <div style={{
                    display: "flex",
                    flexDirection: "row",
                    // justifyContent: "space-between",
                    marginTop: 20,
                    marginBottom: 6,
                }}>
                    <b style={{ color: "#000", fontSize: 10 }} >{paymentMetheod}: </b>
                    <p style={{ color: "#000", fontSize: 10, marginLeft: 10 }} > ₦{NumberWithCommas(InvoiceProducts.payData.amountToPay)}</p>
                </div>
                {complimentaryMethod != "SELECT" && <>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        // justifyContent: "space-between",
                        marginTop: 20,
                        marginBottom: 6,
                    }}>
                        <b style={{ color: "#000", fontSize: 10 }} >{complimentaryMethod}: </b>
                        <p style={{ color: "#000", fontSize: 10, marginLeft: 10 }} >₦{NumberWithCommas(InvoiceProducts.payData.productCostPlusVat - amountToPay)}</p>
                    </div>
                </>}

                {InvoiceProducts.customerphone && <>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        // justifyContent: "space-between",
                        marginTop: 20,
                        marginBottom: 6,
                    }}>
                        <b style={{ color: "#000", fontSize: 10 }} >Customer phone: </b>
                        <p style={{ color: "#000", fontSize: 10, marginLeft: 10 }} >{InvoiceProducts.customerphone}</p>
                    </div>
                </>}
                {InvoiceProducts.marketerid ? <>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        // justifyContent: "space-between",
                        marginTop: 20,
                        marginBottom: 6,
                    }}>
                        <b style={{ color: "#000", fontSize: 10 }} >Customer type </b>
                        <p style={{ color: "#000", fontSize: 10, marginLeft: 10 }} >Referred</p>
                    </div>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        // justifyContent: "space-between",
                        marginTop: 20,
                        marginBottom: 6,
                    }}>
                        <b style={{ color: "#000", fontSize: 10 }} >Marketer: </b>
                        <p style={{ color: "#000", fontSize: 10, marginLeft: 10 }} >{InvoiceProducts.marketerid}</p>
                    </div>
                </> : <>
                    <div style={{
                        display: "flex",
                        flexDirection: "row",
                        // justifyContent: "space-between",
                        marginTop: 20,
                        marginBottom: 6,
                    }}>
                        <b style={{ color: "#000", fontSize: 10 }} >Customer type </b>
                        <p style={{ color: "#000", fontSize: 10, marginLeft: 10 }} >Walk-in customer</p>
                    </div>
                </>}

            </>
            }

        </div>
    }


    const componentRef = React.useRef();
    const handlePrint = useReactToPrint({
        content: () => componentRef.current,
    });



    return (
        <div>
            <ToastContainer />
            {loading && <div style={{
                position: "fixed",
                height: "100%",
                width: "100%",
                left: 0,
                top: 0,
                backgroundColor: "rgb(0,0,0,0.8)",
                zIndex: 100,
                justifyContent: "center",
                display: "flex",
                alignItems: "center",
                flexDirection: "column"
            }} >
                <CircularProgress />
                <spam style={{ color: "white" }} >Please wait.....</spam>
            </div>}

            {console.log(InvoiceProducts)}
            <section className='main-dash'>
                <Sidebar />

                <div className='main'>
                    {/* <DashHeader /> */}

                    {/* paste here */}

                    <section className='sale-m' style={{
                        // backgroundColor: "red"
                    }} >
                        {ViewInvoice && <>
                            <div style={{
                                display: "flex",
                                flexDirection: "column"
                            }} >
                                <div
                                    ref={componentRef}
                                    style={{
                                        flex: 1,
                                        // backgroundColor: "#fff"
                                    }}
                                    className='invoice-s'  >
                                    <section className='invoice' style={{ padding: 20, backgroundColor: "#fff", }} id="pdf-content">

                                        <div className="in-c" style={{ flexDirection: "column", alignItems: "center" }} >
                                            <img src={logo} alt="" style={{ width: 170, height: 70 }} />
                                            <div className="in-l" style={{ textAlign: "center" }} >
                                                <h3 style={{ fontSize: 23, color: "#000" }} >Maison Wellness place</h3>
                                            </div>

                                            <div className="in-r">
                                                <spam style={{ color: "#000", fontSize: 14 }} >2nd creek drive Woji</spam>
                                                <p style={{ color: "#000", fontSize: 14 }} >09126114067,  <spam>https://maisonwellnessplace.com</spam></p>
                                            </div>
                                        </div>

                                        <Divider style={{ marginTop: 0 }} />
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            marginTop: 20,
                                            marginBottom: 6,
                                        }}>
                                            <b style={{ color: "#000", fontSize: 14 }} >Invoice No.:</b>
                                            <p style={{ color: "#000", fontSize: 13 }} >{InvoiceProducts.invoiceID}</p>
                                        </div>
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                        }}>
                                            <b style={{ color: "#000", fontSize: 14 }} >Date:</b>
                                            <p style={{ color: "#000", fontSize: 13 }} >{getFormattedDate()}</p>
                                        </div>
                                        <div style={{
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                        }}>
                                            <b style={{ color: "#000", fontSize: 14 }} >Sales Person:</b>
                                            <p style={{ color: "#000", fontSize: 13 }} >{User.name}</p>
                                        </div>

                                        <table className='table1' style={{ marginTop: 30 }} >
                                            <tr className='tr1'>
                                                <th style={{
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    // backgroundColor: "red",
                                                    width: "16%",
                                                    color: "#000"
                                                }}>S/N</th>
                                                <th style={{
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    // backgroundColor: "#fff",
                                                    width: "90%",
                                                    color: "#000"
                                                }}>PRODUCT</th>
                                                <th style={{
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    // backgroundColor: "#000",
                                                    width: "30%",
                                                    color: "#000"
                                                }}>PRICE</th>
                                                <th style={{
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    // backgroundColor: "red",
                                                    width: "30%",
                                                    color: "#000"
                                                }}>QTY.</th>
                                                <th style={{
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    // backgroundColor: "#000",
                                                    width: "30%",
                                                    color: "#000"
                                                }}>SUBTOTAL</th>
                                            </tr>
                                            {
                                                InvoiceProducts && InvoiceProducts.product && InvoiceProducts.product.map((items, index) => {
                                                    return <tr key={index} style={{ marginBottom: 5 }} >
                                                        <td style={{
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            // backgroundColor: "red",
                                                            width: "16%",
                                                            color: "#000"
                                                        }}>{index + 1}</td>
                                                        <td style={{
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            color: "#000",
                                                            marginRight: 8,
                                                            width: "90%",
                                                            fontWeight: 700,
                                                        }}>{items.name}</td>
                                                        <td style={{
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            // backgroundColor: "red",
                                                            width: "30%",
                                                            textAlign: "center",
                                                            color: "#000"
                                                        }}> {NumberWithCommas(`₦${items.metaData.price}`)} </td>
                                                        <td style={{
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            // backgroundColor: "red",
                                                            width: "30%",
                                                            textAlign: "center",
                                                            color: "#000"
                                                        }}>{items.qty}</td>
                                                        <td style={{
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            // backgroundColor: "red",
                                                            width: "30%",
                                                            textAlign: "center",
                                                            color: "#000"
                                                        }}> {NumberWithCommas(`₦${items.metaData.price * items.qty}`)} </td>
                                                    </tr>
                                                })
                                            }

                                        </table>

                                        <PaymentInvoiceDispaly />





                                    </section>



                                </div>
                                <div style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: 20,
                                    backgroundColor: "#fff",
                                    width: "100%", height: 70,
                                    padding: 10
                                }}>

                                    <p
                                        onClick={() => {
                                            if (!InvoiceProducts.paid) {
                                                // confirmPayment()
                                                handleOpen()
                                                // setamountToPay(InvoiceProducts.totalPrice)
                                                // setamountWithVAT(InvoiceProducts.totalPrice + InvoiceProducts.totalPrice * 0.075)
                                                // console.log(InvoiceProducts)
                                            }
                                        }}
                                        style={{
                                            backgroundColor: InvoiceProducts.paid ? '#fff' : "#2C9676",
                                            color: InvoiceProducts.paid ? "#000" : "white",
                                            padding: 5,
                                            paddingRight: 10,
                                            paddingLeft: 10,
                                            // marginLeft: 10,
                                            borderRadius: 6,
                                            cursor: InvoiceProducts.paid ? "no-drop" : "pointer",
                                            fontSize: InvoiceProducts.paid ? 20 : 13,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: InvoiceProducts.paid ? 900 : 500,
                                        }}
                                    >
                                        {InvoiceProducts.paid ? <>
                                            PAID  </> :
                                            <>  Make payment <FaArrowAltCircleRight style={{ marginLeft: 10 }} /> </>}
                                    </p>

                                    {/* {!InvoiceProducts.paid &&
                                        <> */}
                                    <p
                                        // onClick={() => {
                                        //     saveInvoice("PRINT")
                                        // }}
                                        onClick={handlePrint}
                                        style={{
                                            backgroundColor: '#fff',
                                            color: "#000",
                                            padding: 5,
                                            paddingRight: 10,
                                            paddingLeft: 10,
                                            marginLeft: 10,
                                            borderRadius: 6,
                                            cursor: "pointer",
                                            fontSize: 13,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        Print   <FaPrint style={{ marginLeft: 3 }} />
                                    </p>

                                    {/* <p
                                            onClick={() => {
                                                saveInvoice("DOWNLOAD")
                                            }}
                                            style={{
                                                backgroundColor: '#FA5A7D', color: "white",
                                                padding: 5,
                                                paddingRight: 10,
                                                paddingLeft: 10,
                                                marginLeft: 10,
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                fontSize: 13,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            Download   <FaDownload style={{ marginLeft: 3 }} />
                                        </p> */}

                                    {/* </>

                                    } */}

                                    <div style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        alignItems: "center",
                                    }} >

                                        <p
                                            onClick={() => {
                                                disp_view_invoice(null)
                                            }}
                                            style={{
                                                backgroundColor: '#fff',
                                                color: "#FA5A7D",
                                                padding: 5,
                                                paddingRight: 10,
                                                paddingLeft: 10,
                                                // marginLeft: 10,
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                fontSize: 13,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 500
                                            }}
                                        >
                                            Close   <FaTimes style={{ marginLeft: 2 }} />
                                        </p>

                                        {!InvoiceProducts.paid && InvoiceProducts.generated_by == User.name &&

                                            <p
                                                onClick={() => {
                                                    setloading(true)
                                                    deleteInvoice(InvoiceProducts.invoiceID, User.name)
                                                        .then(responseX => {
                                                            fetchAllInvoicesBySalesRep(User.name)
                                                                .then(response => {
                                                                    disp_savedInvoice(response.data)
                                                                    Notify("Quote deleted successfully")
                                                                    setTimeout(() => {
                                                                        setloading(false)
                                                                        disp_view_invoice(null)
                                                                    }, 2000);

                                                                })
                                                                .catch(error => {
                                                                    setloading(false)
                                                                })

                                                        })
                                                        .catch(error => {
                                                            setloading(false)

                                                        })
                                                }}
                                                style={{
                                                    backgroundColor: '#fff', color: "#FA5A7D",
                                                    padding: 5,
                                                    paddingRight: 10,
                                                    paddingLeft: 10,
                                                    marginLeft: 10,
                                                    borderRadius: 6,
                                                    cursor: "pointer",
                                                    fontSize: 13,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontWeight: 500
                                                }}
                                            >
                                                Delete   <FaDeleteLeft style={{ marginLeft: 2 }} />
                                            </p>
                                        }

                                    </div>
                                </div>
                            </div>
                        </>}


                        <div
                            style={{
                                flex: 1,
                                marginLeft: 40,
                                backgroundColor: "#FFFFFA",
                                position: "sticky",
                                top: 0
                            }}
                            className='invoice-s' id="pdf-content" >
                            <section className='invoice'>

                                <table className='table1'>
                                    <tr className='tr1' style={{ padding: 10 }} >

                                        <th style={{
                                            fontSize: 11,
                                            fontWeight: 900,
                                            // backgroundColor: "red",
                                            width: "40%"
                                        }}>Amount</th>
                                        <th style={{
                                            fontSize: 11,
                                            fontWeight: 900,
                                            // backgroundColor: "red",
                                            width: "60%"
                                        }}>Date.</th>
                                        <th style={{
                                            fontSize: 11,
                                            fontWeight: 900,
                                            // backgroundColor: "red",
                                            width: "30%"
                                        }}>Status</th>
                                        <th style={{
                                            fontSize: 11,
                                            fontWeight: 900,
                                            // backgroundColor: "red",
                                            width: "50%",
                                            textAlign: "center"
                                        }}>Action</th>
                                    </tr>

                                    {SavedInvoices && SavedInvoices.length > 0 ? <>
                                        {
                                            SavedInvoices && SavedInvoices.map((items, index) => {
                                                console.log(items)
                                                const InvoiceProductAmount = items.product ? items.product.reduce((acc, item) => acc + item.totalCost * item.qty, 0) : 0;
                                                return <tr key={index} style={{ marginBottom: 10 }} >

                                                    <td style={{
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        // backgroundColor: "red",
                                                        width: "40%"
                                                    }}> {NumberWithCommas(InvoiceProductAmount)} </td>
                                                    <td style={{
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        // backgroundColor: "red",
                                                        width: "60%"
                                                    }}>{formatDate(items.created_at)}</td>
                                                    <td style={{
                                                        fontSize: 11,
                                                        fontWeight: 500,
                                                        // backgroundColor: "red",
                                                        width: "30%"
                                                    }}>{items.paid ?
                                                        <b style={{ color: "mediumseagreen" }} >Paid</b> : <b style={{ color: "crimson" }} >Not Paid</b>}</td>
                                                    <td
                                                        onClick={() => {
                                                            // Initialize sum variable
                                                            let sum = 0;

                                                            // Iterate through each object in the array
                                                            for (let i = 0; i < items.product.length; i++) {
                                                                // Add the price of the current object to the sum
                                                                sum += items.product[i].totalCost;
                                                            }
                                                            // console.log(items.id)

                                                            disp_invoice_products({
                                                                vat: parseInt(sum * 0.75),
                                                                totalPrice: sum,
                                                                product: items.product,
                                                                paid: items.paid,
                                                                id: items.id,
                                                                invoiceID: items.invoiceID
                                                            })
                                                            disp_view_invoice(true)
                                                            setamountToPay(sum + (sum * 7.5 / 100))
                                                            // console.log(sum+(sum * 7.5 / 100))
                                                        }}
                                                        style={{
                                                            cursor: "pointer",
                                                            color: "#252C58",
                                                            fontSize: 11,
                                                            fontWeight: 500,
                                                            // backgroundColor: "red",
                                                            width: "50%",
                                                            textAlign: "center"
                                                        }} >View <FaArrowAltCircleRight /> </td>
                                                </tr>
                                            })
                                        }
                                    </> : <>
                                        <p className='foot'>You have not created any invoice</p>
                                    </>}



                                </table>

                            </section>
                            {/* <p className='foot'>Enterprise Management | +00 0000 00 0000</p> */}
                        </div>

                    </section>

                </div>

            </section>


            <Modal
                aria-labelledby="transition-modal-title"
                aria-describedby="transition-modal-description"
                open={open}
                onClose={handleClose}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{
                    backdrop: {
                        timeout: 500,
                    },
                }}
            >
                <Fade in={open}>
                    <Box sx={style}>
                        {/* <Typography id="transition-modal-description" sx={{ mt: 2 }}>
                            Select payment method
                        </Typography> */}

                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            // backgroundColor: "darkred",
                            width: "100%",
                            // height: 70,
                            padding: 10
                        }}>
                            <div style={{
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "center",
                                alignItems: "center",
                                // backgroundColor: "blue"
                            }} >

                                <p
                                    onClick={() => {
                                        setpaymentMetheod("Bank transfer")
                                    }}
                                    style={{
                                        color: paymentMetheod == "Bank transfer" ? "#061B34" : "#fff",
                                        backgroundColor: paymentMetheod == "Bank transfer" ? "#fff" : "#061B34",
                                        padding: 5,
                                        paddingRight: 10,
                                        paddingLeft: 10,
                                        marginLeft: 10,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 300,
                                    }}
                                >
                                    Bank transfer   <BsSendCheck style={{ marginLeft: 2 }} />
                                </p>
                                <p
                                    onClick={() => {
                                        setpaymentMetheod("Card POS")
                                    }}
                                    style={{
                                        color: paymentMetheod == "Card POS" ? "#061B34" : "#fff",
                                        backgroundColor: paymentMetheod == "Card POS" ? "#fff" : "#061B34",
                                        padding: 5,
                                        paddingRight: 10,
                                        paddingLeft: 10,
                                        marginLeft: 10,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 300
                                    }}
                                >
                                    Card POS   <BsCalculator style={{ marginLeft: 2 }} />
                                </p>
                                <p
                                    onClick={() => {
                                        setpaymentMetheod("Cash Payment")
                                    }}
                                    style={{
                                        color: paymentMetheod == "Cash Payment" ? "#061B34" : "#fff",
                                        backgroundColor: paymentMetheod == "Cash Payment" ? "#fff" : "#061B34",
                                        padding: 5,
                                        paddingRight: 10,
                                        paddingLeft: 10,
                                        marginLeft: 10,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        fontSize: 13,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 300
                                    }}
                                >
                                    Cash Payment   <FaMoneyBill style={{ marginLeft: 2 }} />
                                </p>

                            </div>


                            {isdiscount == false &&
                                <p
                                    onClick={() => {
                                        setisdiscount(true)
                                    }}
                                    style={{
                                        backgroundColor: InvoiceProducts.paid ? '#fff' : "#2C9676",
                                        color: InvoiceProducts.paid ? "#000" : "white",
                                        padding: 5,
                                        paddingRight: 10,
                                        paddingLeft: 10,
                                        // marginLeft: 10,
                                        borderRadius: 6,
                                        cursor: InvoiceProducts.paid ? "no-drop" : "pointer",
                                        fontSize: InvoiceProducts.paid ? 20 : 13,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: InvoiceProducts.paid ? 900 : 500,
                                    }}
                                >
                                    Give discount <FaSmile style={{ marginLeft: 10, color: "yellow" }} />
                                </p>
                            }

                        </div>

                        <Divider style={{ marginTop: 20 }} />

                        <div style={{
                            backgroundColor: "#F1F6FC"
                        }} >
                            <p
                                style={{
                                    color: "#000",
                                    fontSize: 12,
                                    fontWeight: 300,
                                    marginBottom: -12,
                                    paddingTop: 10,
                                    marginLeft: 10
                                }}
                            >
                                Amount to pay via <b>{paymentMetheod}:</b>
                            </p>
                            <p
                                style={{
                                    color: "#000",
                                    fontSize: 12,
                                    fontWeight: 300,
                                    marginBottom: -12,
                                    paddingTop: 10,
                                    marginLeft: 10
                                }}
                            >

                                {amountToPay > 0 && <b>₦{NumberWithCommas(amountToPay)}</b>}
                            </p>
                            <div style={{
                                padding: 10,
                                backgroundColor: "#F1F6FC",
                                display: "flex",
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }} >
                                <input
                                    style={{
                                        padding: 20,
                                        paddingTop: 10,
                                        paddingBottom: 10,
                                    }}
                                    onChange={(e) => {
                                        // setselectedProduct(null)
                                        setamountToPay(e.target.value);
                                    }}
                                    value={amountToPay}
                                    type="text" name="" id=""
                                    placeholder='Enter amount to pay' />

                                <div style={{
                                    padding: 20,
                                    // backgroundColor: "green",
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    {paymentMetheod == "Bank transfer" ? <>
                                        <p
                                            style={{
                                                color: "#000",
                                                fontSize: 15,
                                                fontWeight: 700,
                                                marginRight: 20
                                            }}
                                        >
                                            providus bank
                                        </p>
                                        <p
                                            style={{
                                                color: "#000",
                                                fontSize: 13,
                                                fontWeight: 700,
                                                marginRight: 20
                                            }}
                                        >
                                            1304988564
                                        </p>
                                        <p
                                            style={{
                                                color: "#000",
                                                fontSize: 13,
                                                fontWeight: 700,
                                            }}
                                        >
                                            maison wellness place
                                        </p>
                                    </> :
                                        <>
                                            <p
                                                style={{
                                                    color: "#000",
                                                    fontSize: 12,
                                                    fontWeight: 300,
                                                }}
                                            >
                                                {paymentMetheod}
                                            </p>
                                        </>}
                                </div>
                            </div>

                            <Divider style={{ marginTop: 30 }} />

                            {amountToPay < amountWithVAT && <>
                                <div style={{
                                    padding: 10,
                                    marginTop: 20

                                }} >
                                    <p
                                        style={{
                                            color: "darkred",
                                            fontSize: 15,
                                            fontWeight: 300,
                                            marginRight: 20
                                        }}
                                    >
                                        Select a complementry payment method.
                                    </p>

                                    <div style={{
                                        // padding: 10,
                                        // backgroundColor: "lightgrey",
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }} >
                                        <select
                                            style={{
                                                padding: 10,
                                                width: 190
                                            }}
                                            onChange={(e) => {
                                                setcomplimentaryMethod(e.target.value);
                                            }}
                                            value={complimentaryMethod}
                                            type="text" name="" id=""
                                            placeholder='Enter amount to pay'>
                                            <option value="SELECT" >Complimentary payment</option>
                                            <option value="Bank transfer" >Bank transfer</option>
                                            <option value="Card POS" >Card POS</option>
                                            <option value="Cash Payment" >Cash Payment</option>
                                        </select>

                                        <div style={{
                                            padding: 20,
                                            // backgroundColor: "green",
                                            display: "flex",
                                            flexDirection: "row",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}>

                                            {complimentaryMethod == "SELECT" ? <>
                                                <p
                                                    style={{
                                                        color: "crimson",
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                        marginRight: 20
                                                    }}
                                                >
                                                    Invalid amount
                                                </p>
                                            </> : <>
                                                <AmountToPay />
                                            </>}



                                        </div>
                                    </div>


                                </div>
                            </>}

                        </div>

                        {isdiscount == true &&
                            <>
                                <p
                                    style={{
                                        color: "#000",
                                        fontSize: 15,
                                        fontWeight: 300,
                                        marginRight: 20,
                                        paddingTop: 20,
                                    }}
                                >
                                    Offer a discount (%)
                                </p>

                                <div style={{
                                    padding: 10,
                                    backgroundColor: "#F1F6FC",
                                    display: "flex",
                                    flexDirection: "row",
                                    // justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <input

                                        style={{
                                            padding: 20,
                                            paddingTop: 10,
                                            paddingBottom: 10,
                                        }}
                                        onChange={(e) => {
                                            setdiscount(e.target.value);
                                            let discAmt = grossTotal * parseInt(e.target.value) / 100;
                                            // setamountToPay(parseInt(grossTotal-discAmt))
                                        }}
                                        value={discount}
                                        type="number" placeholder="How many percent?" />

                                    <p
                                        onClick={() => {
                                            setisdiscount(false)
                                            setdiscount(0);
                                        }}
                                        style={{
                                            backgroundColor: "crimson",
                                            color: "white",
                                            padding: 5,
                                            paddingRight: 10,
                                            paddingLeft: 10,
                                            marginLeft: 10,
                                            borderRadius: 6,
                                            cursor: "pointer",
                                            fontSize: 13,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: 500,
                                        }}
                                    >
                                        Cancel <FaTimes style={{ marginLeft: 10, color: "yellow" }} />
                                    </p>

                                </div>
                            </>

                        }


                        <p
                            style={{
                                color: "#000",
                                fontSize: 15,
                                fontWeight: 300,
                                marginRight: 20,
                                paddingTop: 20,
                            }}
                        >
                            Optional information
                        </p>

                        <div style={{
                            padding: 10,
                            backgroundColor: "#F1F6FC",
                            display: "flex",
                            flexDirection: "row",
                            // justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <input
                                style={{
                                    padding: 20,
                                    paddingTop: 10,
                                    paddingBottom: 10,
                                }}
                                onChange={(e) => {
                                    setcustomerphone(e.target.value);
                                }}
                                value={customerphone}
                                type="text" placeholder="Customer's phone" />

                            <select
                                style={{
                                    padding: 20,
                                    paddingTop: 10,
                                    paddingBottom: 10,
                                    marginLeft: 10
                                }}
                                onChange={(e) => {
                                    // setselectedProduct(null)
                                    setmarketerid(e.target.value);
                                }}
                                type="text" placeholder="Marketer ID" >
                                <option value={null} >Marketer's name</option>
                                {allmarketers && allmarketers.map((items, index) => {
                                    return <option value={items.name} >{items.name}</option>
                                })}
                            </select>

                        </div>





                        <Paymentbutton />
                    </Box>
                </Fade>
            </Modal>


        </div>




    )
}


const mapStateToProps = (state) => {
    return {
        appState: state.user,
    };
};


const mapDispatchToProps = (dispatch, encoded) => {
    return {
        disp_savedInvoice: (payload) => dispatch(Saved_invoices(payload)),
        disp_invoice_products: (payload) => dispatch(Invoice_Product(payload)),
        disp_view_invoice: (payload) => dispatch(View_invoice(payload)),
    };
};


export default connect(mapStateToProps, mapDispatchToProps)(Invoice); 